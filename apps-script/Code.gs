/* ==========================================================================
   BARBEARIA PRIME — SERVIDOR DE AGENDAMENTO (Google Apps Script)
   --------------------------------------------------------------------------
   O que este script faz:
     • Guarda as reservas numa Planilha Google (aba "Reservas").
     • Informa ao site quais horários já estão ocupados.
     • Impede dois clientes de reservarem o mesmo horário (com trava/lock).
     • Envia AUTOMATICAMENTE uma mensagem no WhatsApp do barbeiro a cada
       nova reserva, usando a API gratuita CallMeBot.

   Os dados sensíveis (número do barbeiro e chave da API) NÃO ficam no site:
   são guardados nas "Propriedades do script" (veja o README, passo 3).

     WHATSAPP_NUMERO   → ex.: 5511912345678 (55 + DDD + número)
     CALLMEBOT_APIKEY  → chave recebida do CallMeBot

   Para cancelar uma reserva: na planilha, mude a coluna "Status" para
   "Cancelado". O horário volta a ficar livre no site.
   ========================================================================== */

/* ⚠ Mantenha IGUAL ao js/config.js do site */
var CONFIG = {
  ABA: 'Reservas',
  HORARIOS: {
    0: null,             // domingo
    1: null,             // segunda
    2: ['09:00', '19:00'],
    3: ['09:00', '19:00'],
    4: ['09:00', '19:00'],
    5: ['09:00', '19:00'],
    6: ['08:00', '17:00']  // sábado
  },
  PAUSA: ['12:00', '13:00'],
  INTERVALO_MINUTOS: 30,
  DIAS_ANTECEDENCIA: 21,
  ANTECEDENCIA_MINIMA: 60,
  MAX_RESERVAS_POR_TELEFONE: 3   // reservas futuras ativas por telefone (anti-abuso)
};

var CABECALHO = ['Criado em', 'Nome', 'Telefone', 'Serviço', 'Valor', 'Data', 'Horário', 'Status', 'WhatsApp'];
var COL = { NOME: 1, TELEFONE: 2, SERVICO: 3, VALOR: 4, DATA: 5, HORA: 6, STATUS: 7, WHATS: 8 };

/* ========================================================================
   ENDPOINTS
   ======================================================================== */

/** GET ?action=horarios&data=AAAA-MM-DD */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'horarios') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data || '')) return resposta_({ ok: false, erro: 'Data inválida.' });
      return resposta_({ ok: true, ocupados: horariosOcupados_(p.data) });
    }
    return resposta_({ ok: true, servico: 'Barbearia Prime — API de agendamento' });
  } catch (err) {
    return resposta_({ ok: false, erro: 'Erro interno.' });
  }
}

/** POST com corpo JSON { action:'reservar', nome, telefone, servico, valor, data, hora } */
function doPost(e) {
  var dados;
  try {
    dados = JSON.parse(e.postData.contents);
  } catch (err) {
    return resposta_({ ok: false, erro: 'Requisição inválida.' });
  }
  if (dados.action !== 'reservar') return resposta_({ ok: false, erro: 'Ação desconhecida.' });

  // 1) Validação dos campos
  var r = {
    nome: limpar_(dados.nome, 60),
    telefone: limpar_(dados.telefone, 20),
    servico: limpar_(dados.servico, 60),
    valor: limpar_(dados.valor, 20),
    data: String(dados.data || ''),
    hora: String(dados.hora || '')
  };
  var digitos = r.telefone.replace(/\D/g, '');
  if (r.nome.length < 3) return resposta_({ ok: false, erro: 'Nome inválido.' });
  if (digitos.length < 10 || digitos.length > 11) return resposta_({ ok: false, erro: 'Telefone inválido.' });
  if (!r.servico) return resposta_({ ok: false, erro: 'Serviço inválido.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data) || !/^\d{2}:\d{2}$/.test(r.hora)) {
    return resposta_({ ok: false, erro: 'Data ou horário inválido.' });
  }
  if (horariosDoDia_(r.data).indexOf(r.hora) === -1) {
    return resposta_({ ok: false, erro: 'Horário fora do expediente ou já passou.' });
  }

  // 2) Trava: garante que duas pessoas não reservem o mesmo horário ao mesmo tempo
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return resposta_({ ok: false, erro: 'Sistema ocupado, tente novamente.' });

  var linha;
  try {
    if (horariosOcupados_(r.data).indexOf(r.hora) !== -1) {
      return resposta_({ ok: false, codigo: 'OCUPADO', erro: 'Este horário acabou de ser reservado.' });
    }
    if (reservasAtivasDoTelefone_(digitos) >= CONFIG.MAX_RESERVAS_POR_TELEFONE) {
      return resposta_({ ok: false, erro: 'Limite de reservas para este telefone atingido. Fale com a barbearia.' });
    }

    var aba = planilha_();
    aba.appendRow([
      agora_('dd/MM/yyyy HH:mm:ss'),
      r.nome, r.telefone, r.servico, r.valor, r.data, r.hora,
      'Confirmado', 'Enviando…'
    ]);
    linha = aba.getLastRow();
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // 3) WhatsApp para o barbeiro (fora da trava, para não atrasar outros clientes)
  var enviado = enviarWhatsApp_(mensagem_(r));
  planilha_().getRange(linha, COL.WHATS + 1).setValue(enviado ? 'Enviado' : 'Falhou');

  return resposta_({ ok: true, whatsapp: enviado });
}

/* ========================================================================
   WHATSAPP (CallMeBot)
   ======================================================================== */
function mensagem_(r) {
  var partes = r.data.split('-');
  var d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]), 12);
  var semana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][d.getDay()];

  return [
    '💈 *Nova reserva — Barbearia Prime*',
    '',
    '👤 *Cliente:* ' + r.nome,
    '📞 *Telefone:* ' + r.telefone,
    '✂️ *Serviço:* ' + r.servico + (r.valor ? ' (' + r.valor + ')' : ''),
    '📅 *Data:* ' + semana + ', ' + partes[2] + '/' + partes[1] + '/' + partes[0],
    '⏰ *Horário:* ' + r.hora
  ].join('\n');
}

function enviarWhatsApp_(texto) {
  var props = PropertiesService.getScriptProperties();
  var numero = String(props.getProperty('WHATSAPP_NUMERO') || '').replace(/\D/g, '');
  var apikey = props.getProperty('CALLMEBOT_APIKEY');
  if (!numero || !apikey) {
    console.warn('WHATSAPP_NUMERO ou CALLMEBOT_APIKEY não configurados nas Propriedades do script.');
    return false;
  }

  var url = 'https://api.callmebot.com/whatsapp.php' +
    '?phone=' + encodeURIComponent('+' + numero) +
    '&text=' + encodeURIComponent(texto) +
    '&apikey=' + encodeURIComponent(apikey);

  try {
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var ok = resp.getResponseCode() === 200 && !/error|invalid/i.test(resp.getContentText().slice(0, 300));
    if (!ok) console.warn('CallMeBot respondeu: ' + resp.getResponseCode() + ' ' + resp.getContentText().slice(0, 300));
    return ok;
  } catch (err) {
    console.error('Falha ao enviar WhatsApp: ' + err);
    return false;
  }
}

/** Execute esta função no editor para testar o envio do WhatsApp. */
function testarWhatsApp() {
  var ok = enviarWhatsApp_('✅ Teste do sistema de agendamento da Barbearia Prime. Se você recebeu esta mensagem, está tudo funcionando!');
  console.log(ok ? 'Mensagem enviada com sucesso!' : 'Falhou — confira as Propriedades do script e o registro de execução.');
}

/* ========================================================================
   PLANILHA
   ======================================================================== */
function planilha_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(CONFIG.ABA);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA);
    aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO])
      .setFontWeight('bold').setBackground('#0b0b0b').setFontColor('#3a6be0');
    aba.setFrozenRows(1);
    // Formato texto: evita que o Sheets converta data/hora automaticamente
    aba.getRange('A:I').setNumberFormat('@');
    aba.setColumnWidths(1, CABECALHO.length, 140);
  }
  return aba;
}

function linhas_() {
  var aba = planilha_();
  var total = aba.getLastRow() - 1;
  if (total < 1) return [];
  return aba.getRange(2, 1, total, CABECALHO.length).getDisplayValues();
}

function ativa_(linha) {
  return String(linha[COL.STATUS]).trim().toLowerCase() !== 'cancelado';
}

function horariosOcupados_(data) {
  return linhas_()
    .filter(function (l) { return l[COL.DATA] === data && ativa_(l); })
    .map(function (l) { return l[COL.HORA]; });
}

function reservasAtivasDoTelefone_(digitos) {
  var hoje = agora_('yyyy-MM-dd');
  return linhas_().filter(function (l) {
    return String(l[COL.TELEFONE]).replace(/\D/g, '') === digitos && l[COL.DATA] >= hoje && ativa_(l);
  }).length;
}

/* ========================================================================
   REGRAS DE HORÁRIO
   ======================================================================== */
function horariosDoDia_(data) {
  var partes = data.split('-').map(Number);
  var dia = new Date(partes[0], partes[1] - 1, partes[2], 12);
  var hoje = agora_('yyyy-MM-dd');

  // Fora do intervalo permitido (passado ou muito à frente)
  var limite = new Date();
  limite.setDate(limite.getDate() + CONFIG.DIAS_ANTECEDENCIA);
  if (data < hoje || data > Utilities.formatDate(limite, tz_(), 'yyyy-MM-dd')) return [];

  var faixa = CONFIG.HORARIOS[dia.getDay()];
  if (!faixa) return [];

  var passo = CONFIG.INTERVALO_MINUTOS;
  var ini = min_(faixa[0]), fim = min_(faixa[1]);
  var pausa = CONFIG.PAUSA ? CONFIG.PAUSA.map(min_) : null;
  var minimo = data === hoje ? min_(agora_('HH:mm')) + CONFIG.ANTECEDENCIA_MINIMA : -1;

  var lista = [];
  for (var t = ini; t + passo <= fim; t += passo) {
    if (pausa && t < pausa[1] && t + passo > pausa[0]) continue;
    if (t < minimo) continue;
    lista.push(('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2));
  }
  return lista;
}

/* ========================================================================
   UTILITÁRIOS
   ======================================================================== */
function resposta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function tz_() { return Session.getScriptTimeZone() || 'America/Sao_Paulo'; }
function agora_(formato) { return Utilities.formatDate(new Date(), tz_(), formato); }
function min_(hhmm) { var p = hhmm.split(':'); return Number(p[0]) * 60 + Number(p[1]); }

/** Limpa texto e impede "injeção de fórmula" na planilha. */
function limpar_(valor, max) {
  var s = String(valor || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
