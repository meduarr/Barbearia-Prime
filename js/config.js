/* ==========================================================================
   BARBEARIA PRIME — CONFIGURAÇÃO CENTRAL
   --------------------------------------------------------------------------
   Este é o ÚNICO arquivo que precisa ser editado para colocar o site no ar
   com os dados reais da barbearia. Veja o passo a passo no README.md.
   ========================================================================== */

window.PRIME_CONFIG = {

  /* ------------------------------------------------------------------------
     1) CONTATOS (aparecem no rodapé)
     Deixe vazio ('') enquanto não tiver o dado real — o site mostra "em breve".
     ------------------------------------------------------------------------ */
  instagram: '',          // apenas o usuário, sem @. Ex.: 'barbeariaprime'
  email: '',              // Ex.: 'contato@seudominio.com.br'

  /* ------------------------------------------------------------------------
     2) WHATSAPP DO BARBEIRO
     Número no formato internacional, só dígitos: 55 + DDD + número.
     Ex.: '5511912345678'
     Usado no botão "Falar no WhatsApp" e no modo local (sem servidor).
     ------------------------------------------------------------------------ */
  barbeiroWhatsApp: '',

  /* ------------------------------------------------------------------------
     3) SERVIDOR DE AGENDAMENTO (Google Apps Script)
     Cole aqui a URL do App da Web publicado (termina em /exec).
     Com ela configurada:
       • os horários reservados ficam salvos numa planilha Google;
       • todos os clientes veem os mesmos horários ocupados;
       • o barbeiro recebe a mensagem no WhatsApp AUTOMATICAMENTE.
     Sem ela, o site roda em "modo local" (apenas para testes).
     ------------------------------------------------------------------------ */
  bookingApiUrl: '',

  /* ------------------------------------------------------------------------
     4) HORÁRIO DE FUNCIONAMENTO
     Chave = dia da semana (0 = domingo ... 6 = sábado).
     null = fechado. [abertura, fechamento] no formato 'HH:MM'.
     ⚠ Mantenha IGUAL ao CONFIG do arquivo apps-script/Code.gs.
     ------------------------------------------------------------------------ */
  horarios: {
    0: null,               // domingo
    1: null,               // segunda
    2: ['09:00', '19:00'], // terça
    3: ['09:00', '19:00'], // quarta
    4: ['09:00', '19:00'], // quinta
    5: ['09:00', '19:00'], // sexta
    6: ['08:00', '17:00']  // sábado
  },

  /* Intervalo de almoço (sem atendimento). Use null para não ter pausa. */
  pausa: ['12:00', '13:00'],

  /* Duração de cada horário de atendimento, em minutos. */
  intervaloMinutos: 30,

  /* Quantos dias à frente o cliente pode agendar. */
  diasAntecedencia: 21,

  /* Antecedência mínima (em minutos) para agendar no mesmo dia. */
  antecedenciaMinima: 60
};
