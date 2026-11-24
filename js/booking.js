/* ==========================================================================
   BARBEARIA PRIME — SISTEMA DE AGENDAMENTO
   --------------------------------------------------------------------------
   Dois modos de funcionamento (definidos em js/config.js):

   ▸ MODO SERVIDOR (recomendado / produção)
     bookingApiUrl preenchido com a URL do Google Apps Script.
       • GET  ?action=horarios&data=AAAA-MM-DD  → horários já ocupados
       • POST { nome, telefone, servico, ... }   → grava a reserva na planilha,
         recusa horário já ocupado e ENVIA O WHATSAPP AO BARBEIRO
         automaticamente pelo servidor (CallMeBot).
     Todos os clientes compartilham a mesma agenda.

   ▸ MODO LOCAL (testes)
     Sem bookingApiUrl. As reservas ficam no navegador (localStorage) e o
     WhatsApp do barbeiro é aberto com a mensagem pronta (wa.me) para envio.
     Serve para testar o fluxo antes de configurar o servidor.
   ========================================================================== */

(function () {
  'use strict';

  const CONFIG = window.PRIME_CONFIG;
  const SERVICOS = window.PRIME_SERVICOS;
  const U = window.PrimeUtils;
  const toast = window.primeToast || ((m) => alert(m));

  const MODO_SERVIDOR = Boolean(CONFIG.bookingApiUrl && CONFIG.bookingApiUrl.trim());
  const STORAGE_KEY = 'prime_reservas_v1';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const esc = (str) => String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* ---------- Elementos ---------- */
  const form = $('#booking-form');
  const inNome = $('#b-nome');
  const inTel = $('#b-telefone');
  const inServico = $('#b-servico');
  const diasWrap = $('#b-dias');
  const slotsWrap = $('#b-horarios');
  const slotsHint = $('#slots-hint');
  const btnSubmit = $('#booking-submit');
  const notice = $('#booking-notice');

  /* ---------- Estado ---------- */
  const estado = { data: null, hora: null };
  let requisicaoHorarios = 0; // evita respostas fora de ordem

  /* ========================================================================
     UTILITÁRIOS DE DATA E HORA
     ======================================================================== */
  const pad = (n) => String(n).padStart(2, '0');
  const paraMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const paraHora = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const isoData = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dataDeIso = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };

  const fmtDataLonga = (iso) => dataDeIso(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  /** Lista todos os horários de atendimento de um dia (sem considerar ocupação). */
  function horariosDoDia(iso) {
    const faixa = CONFIG.horarios[dataDeIso(iso).getDay()];
    if (!faixa) return [];

    const passo = CONFIG.intervaloMinutos;
    const ini = paraMin(faixa[0]);
    const fim = paraMin(faixa[1]);
    const pausa = CONFIG.pausa ? CONFIG.pausa.map(paraMin) : null;

    // Antecedência mínima para o dia de hoje
    const agora = new Date();
    const ehHoje = iso === isoData(agora);
    const minimo = agora.getHours() * 60 + agora.getMinutes() + (CONFIG.antecedenciaMinima || 0);

    const lista = [];
    for (let t = ini; t + passo <= fim; t += passo) {
      if (pausa && t < pausa[1] && t + passo > pausa[0]) continue; // cai no almoço
      if (ehHoje && t < minimo) continue;                           // já passou
      lista.push(paraHora(t));
    }
    return lista;
  }

  /* ========================================================================
     CAMADA DE DADOS (servidor ou local)
     ======================================================================== */
  const api = {
    /** Retorna a lista de horários já reservados para a data. */
    async ocupados(iso) {
      if (MODO_SERVIDOR) {
        const url = `${CONFIG.bookingApiUrl}?action=horarios&data=${encodeURIComponent(iso)}`;
        const resp = await fetch(url, { method: 'GET' });
        const json = await resp.json();
        if (!json.ok) throw new Error(json.erro || 'Falha ao consultar horários');
        return json.ocupados || [];
      }
      return lerLocal().filter((r) => r.data === iso).map((r) => r.hora);
    },

    /** Envia a reserva. Retorna { ok, whatsapp, codigo, erro }. */
    async reservar(reserva) {
      if (MODO_SERVIDOR) {
        // Content-Type text/plain evita a requisição "preflight" (CORS) no Apps Script
        const resp = await fetch(CONFIG.bookingApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'reservar', ...reserva })
        });
        return resp.json();
      }

      const reservas = lerLocal();
      if (reservas.some((r) => r.data === reserva.data && r.hora === reserva.hora)) {
        return { ok: false, codigo: 'OCUPADO', erro: 'Este horário acabou de ser reservado.' };
      }
      reservas.push({ ...reserva, criadoEm: new Date().toISOString() });
      gravarLocal(reservas);
      return { ok: true, whatsapp: false, local: true };
    }
  };

  function lerLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
  }
  function gravarLocal(lista) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); } catch (e) { /* armazenamento indisponível */ }
  }

  /* ========================================================================
     MENSAGEM DO WHATSAPP (usada no modo local e no botão de contato)
     ======================================================================== */
  function montarMensagem(r) {
    return [
      '💈 *Nova reserva — Barbearia Prime*',
      '',
      `👤 *Cliente:* ${r.nome}`,
      `📞 *Telefone:* ${r.telefone}`,
      `✂️ *Serviço:* ${r.servico} (${r.valor})`,
      `📅 *Data:* ${fmtDataLonga(r.data)}`,
      `⏰ *Horário:* ${r.hora}`
    ].join('\n');
  }

  function linkWhatsApp(texto) {
    const numero = String(CONFIG.barbeiroWhatsApp || '').replace(/\D/g, '');
    if (!numero) return null;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  /* ========================================================================
     INTERFACE: SERVIÇOS
     ======================================================================== */
  (function preencherServicos() {
    const grupos = [
      ['promocao', 'Promoção'],
      ['corte', 'Cortes'],
      ['servico', 'Barba & escova']
    ];
    grupos.forEach(([cat, rotulo]) => {
      const itens = SERVICOS.filter((s) => s.categoria === cat);
      if (!itens.length) return;
      const og = document.createElement('optgroup');
      og.label = rotulo;
      itens.forEach((s) => {
        const op = document.createElement('option');
        op.value = s.id;
        const final = U.precoFinal(s);
        op.textContent = s.desconto
          ? `${s.nome} — ${U.moeda(final)} (${s.desconto}% OFF)`
          : `${s.nome} — ${U.moeda(final)}`;
        og.appendChild(op);
      });
      inServico.appendChild(og);
    });
  })();

  /* ========================================================================
     INTERFACE: DIAS
     ======================================================================== */
  function renderDias() {
    diasWrap.innerHTML = '';
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (let i = 0; i < CONFIG.diasAntecedencia; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const iso = isoData(d);
      if (!horariosDoDia(iso).length) continue; // fechado ou sem horários restantes

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day';
      btn.dataset.data = iso;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('aria-label', fmtDataLonga(iso));

      const semana = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const mes = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      btn.innerHTML = `<span class="day__wd">${semana}</span><span class="day__num">${pad(d.getDate())}</span><span class="day__mo">${mes}</span>`;
      btn.addEventListener('click', () => selecionarDia(iso));
      diasWrap.appendChild(btn);
    }

    if (!diasWrap.children.length) {
      diasWrap.innerHTML = '<p class="slots__msg">Nenhum dia disponível no momento.</p>';
    }
  }

  function selecionarDia(iso) {
    estado.data = iso;
    estado.hora = null;
    diasWrap.querySelectorAll('.day').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.data === iso)));
    limparErro(diasWrap);
    atualizarResumo();
    carregarHorarios(iso);
  }

  /* ========================================================================
     INTERFACE: HORÁRIOS
     ======================================================================== */
  async function carregarHorarios(iso) {
    const id = ++requisicaoHorarios;
    const todos = horariosDoDia(iso);

    // Esqueleto de carregamento
    slotsWrap.innerHTML = Array.from({ length: Math.min(todos.length, 12) || 6 })
      .map(() => '<span class="slot--skeleton"></span>').join('');
    slotsHint.textContent = '';

    let ocupados = [];
    try {
      ocupados = await api.ocupados(iso);
    } catch (err) {
      if (id !== requisicaoHorarios) return;
      console.error(err);
      slotsWrap.innerHTML = '<p class="slots__msg">Não foi possível carregar os horários. <button type="button" class="link-retry"><u>Tentar novamente</u></button></p>';
      slotsWrap.querySelector('.link-retry').addEventListener('click', () => carregarHorarios(iso));
      return;
    }
    if (id !== requisicaoHorarios) return; // o cliente já trocou de dia

    renderHorarios(todos, new Set(ocupados));
  }

  function renderHorarios(todos, ocupados) {
    if (!todos.length) {
      slotsWrap.innerHTML = '<p class="slots__msg">Sem horários de atendimento neste dia.</p>';
      return;
    }
    // Se o horário escolhido deixou de existir (passou ou foi ocupado), desmarca
    if (estado.hora && (!todos.includes(estado.hora) || ocupados.has(estado.hora))) {
      estado.hora = null;
      atualizarResumo();
    }

    const livres = todos.filter((h) => !ocupados.has(h)).length;
    slotsHint.textContent = livres ? `· ${livres} ${livres === 1 ? 'livre' : 'livres'}` : '';

    if (!livres) {
      slotsWrap.innerHTML = '<p class="slots__msg">Agenda cheia neste dia. Escolha outra data. 😉</p>';
      return;
    }

    slotsWrap.innerHTML = '';
    todos.forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.textContent = h;
      b.dataset.hora = h;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(h === estado.hora));
      if (ocupados.has(h)) {
        b.disabled = true;
        b.setAttribute('aria-label', `${h} — ocupado`);
      }
      b.addEventListener('click', () => selecionarHora(h));
      slotsWrap.appendChild(b);
    });
  }

  function selecionarHora(h) {
    estado.hora = h;
    slotsWrap.querySelectorAll('.slot').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.hora === h)));
    limparErro(slotsWrap);
    atualizarResumo();
  }

  /* ========================================================================
     RESUMO
     ======================================================================== */
  function atualizarResumo() {
    const s = U.servicoPorId(inServico.value);
    const set = (k, v) => { document.querySelector(`[data-summary="${k}"]`).textContent = v || '—'; };
    set('servico', s ? s.nome : '');
    set('data', estado.data ? dataDeIso(estado.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '');
    set('hora', estado.hora);
    set('total', s ? U.moeda(U.precoFinal(s)) : '');
  }

  /* ========================================================================
     VALIDAÇÃO E MÁSCARA
     ======================================================================== */
  function mascaraTelefone(valor) {
    const d = valor.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  inTel.addEventListener('input', () => { inTel.value = mascaraTelefone(inTel.value); limparErro(inTel); });
  inNome.addEventListener('input', () => limparErro(inNome));
  inServico.addEventListener('change', () => { limparErro(inServico); atualizarResumo(); });

  function campoDe(el) { return el.closest('.field'); }
  function mostrarErro(el, msg) {
    const f = campoDe(el);
    f.classList.add('has-error');
    f.querySelector('.field__error').textContent = msg;
  }
  function limparErro(el) {
    const f = campoDe(el);
    f.classList.remove('has-error');
    f.querySelector('.field__error').textContent = '';
  }

  function validar() {
    let primeiroErro = null;
    const erro = (el, msg) => { mostrarErro(el, msg); primeiroErro = primeiroErro || el; };

    const nome = inNome.value.trim().replace(/\s+/g, ' ');
    if (nome.length < 3) erro(inNome, 'Informe seu nome (mínimo 3 letras).');

    const tel = inTel.value.replace(/\D/g, '');
    if (tel.length < 10 || tel.length > 11) erro(inTel, 'Informe um telefone válido com DDD.');

    if (!inServico.value) erro(inServico, 'Escolha um serviço.');
    if (!estado.data) erro(diasWrap, 'Escolha uma data.');
    if (!estado.hora) erro(slotsWrap, estado.data ? 'Escolha um horário livre.' : 'Escolha a data para ver os horários.');

    if (primeiroErro) {
      campoDe(primeiroErro).scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (primeiroErro.focus) primeiroErro.focus({ preventScroll: true });
      return null;
    }

    const s = U.servicoPorId(inServico.value);
    return {
      nome,
      telefone: inTel.value,
      servicoId: s.id,
      servico: s.nome,
      valor: U.moeda(U.precoFinal(s)),
      data: estado.data,
      hora: estado.hora
    };
  }

  /* ========================================================================
     ENVIO
     ======================================================================== */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reserva = validar();
    if (!reserva) return;

    // Modo local: abre o WhatsApp imediatamente (antes de qualquer "await"),
    // senão o navegador pode bloquear a nova aba como pop-up.
    let janelaWhats = null;
    const link = linkWhatsApp(montarMensagem(reserva));
    if (!MODO_SERVIDOR && link) {
      janelaWhats = window.open(link, '_blank');
      if (janelaWhats) janelaWhats.opener = null; // segurança: a nova aba não controla o site
    }

    carregando(true);
    try {
      const res = await api.reservar(reserva);

      if (!res.ok) {
        if (res.codigo === 'OCUPADO') {
          toast('Ops! Esse horário acabou de ser reservado. Escolha outro.', 'error');
          estado.hora = null;
          atualizarResumo();
          carregarHorarios(reserva.data);
        } else {
          toast(res.erro || 'Não foi possível concluir o agendamento.', 'error');
        }
        return;
      }

      abrirModal(reserva, res, link, Boolean(janelaWhats));
      resetarFormulario();
    } catch (err) {
      console.error(err);
      toast('Falha de conexão. Verifique sua internet e tente novamente.', 'error');
    } finally {
      carregando(false);
    }
  });

  function carregando(ativo) {
    btnSubmit.classList.toggle('is-loading', ativo);
    btnSubmit.disabled = ativo;
    btnSubmit.querySelector('.btn__label').textContent = ativo ? 'Confirmando…' : 'Confirmar agendamento';
  }

  function resetarFormulario() {
    const diaAnterior = estado.data;
    form.reset();
    estado.hora = null;
    atualizarResumo();
    // Mantém o dia selecionado e recarrega os horários (o reservado aparece ocupado)
    if (diaAnterior) selecionarDia(diaAnterior);
  }

  /* ========================================================================
     MODAL DE CONFIRMAÇÃO
     ======================================================================== */
  const modal = $('#modal');
  let focoAnterior = null;

  function abrirModal(r, res, link, whatsAberto) {
    let status;
    if (res.whatsapp) {
      status = '<p class="modal__status modal__status--ok">✔ O barbeiro já foi avisado pelo WhatsApp.</p>';
    } else if (res.local && whatsAberto) {
      status = '<p class="modal__status modal__status--warn">Abrimos o WhatsApp com a mensagem pronta — toque em <b>enviar</b> para avisar o barbeiro.</p>';
    } else if (res.local) {
      status = '<p class="modal__status modal__status--warn">Modo de teste: configure o WhatsApp do barbeiro em <code>js/config.js</code>.</p>';
    } else {
      status = '<p class="modal__status modal__status--warn">Reserva registrada. Se quiser, envie também a mensagem ao barbeiro pelo botão abaixo.</p>';
    }

    $('#modal-body').innerHTML = `
      <p>Obrigado, <strong>${esc(r.nome.split(' ')[0])}</strong>! Seu horário está reservado.</p>
      <dl>
        <div><dt>Serviço</dt><dd>${esc(r.servico)}</dd></div>
        <div><dt>Data</dt><dd>${esc(fmtDataLonga(r.data))}</dd></div>
        <div><dt>Horário</dt><dd>${esc(r.hora)}</dd></div>
        <div><dt>Valor</dt><dd>${esc(r.valor)}</dd></div>
      </dl>
      ${status}`;

    const acoes = [];
    if (link && !res.whatsapp) {
      acoes.push(`<a class="btn btn--whats btn--block" href="${esc(link)}" target="_blank" rel="noopener">Enviar no WhatsApp</a>`);
    }
    acoes.push('<button type="button" class="btn btn--dark btn--block" data-close>Fechar</button>');
    $('#modal-actions').innerHTML = acoes.join('');

    focoAnterior = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-close].btn', modal).focus();
  }

  function fecharModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (focoAnterior) focoAnterior.focus({ preventScroll: true });
  }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) fecharModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) fecharModal(); });

  /* ========================================================================
     AVISO DE MODO LOCAL
     ======================================================================== */
  if (!MODO_SERVIDOR) {
    notice.hidden = false;
    notice.innerHTML = '<strong>Modo de teste.</strong> As reservas estão sendo salvas só neste navegador. ' +
      'Para a agenda compartilhada e o aviso automático no WhatsApp, configure <code>bookingApiUrl</code> em ' +
      '<code>js/config.js</code> (veja o README).';
  }

  /* ========================================================================
     API PÚBLICA (usada pelos botões "Agendar" dos cards)
     ======================================================================== */
  window.PrimeBooking = {
    selecionarServico(id) {
      if (!U.servicoPorId(id)) return;
      inServico.value = id;
      limparErro(inServico);
      atualizarResumo();
      // Destaque visual rápido no campo
      inServico.animate(
        [{ boxShadow: '0 0 0 0 rgba(30,58,138,.0)' }, { boxShadow: '0 0 0 6px rgba(30,58,138,.55)' }, { boxShadow: '0 0 0 0 rgba(30,58,138,0)' }],
        { duration: 1200, delay: 500 }
      );
    }
  };

  /* ---------- Inicialização ---------- */
  renderDias();
  atualizarResumo();

  // Atualiza a lista de dias/horários à meia-noite e a cada 5 min (horários que passaram)
  setInterval(() => {
    const sel = estado.data;
    renderDias();
    if (sel && diasWrap.querySelector(`[data-data="${sel}"]`)) {
      diasWrap.querySelector(`[data-data="${sel}"]`).setAttribute('aria-checked', 'true');
      carregarHorarios(sel);
    } else {
      estado.data = null; estado.hora = null;
      slotsWrap.innerHTML = '<p class="slots__placeholder">Escolha um dia para ver os horários disponíveis.</p>';
      atualizarResumo();
    }
  }, 5 * 60 * 1000);
})();
