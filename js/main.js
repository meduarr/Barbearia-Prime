/* ==========================================================================
   BARBEARIA PRIME — INTERFACE
   --------------------------------------------------------------------------
   Responsável por:
     1. Cabeçalho (sombra ao rolar, menu mobile, link ativo)
     2. Carrossel do banner
     3. Renderização dos cards de cortes/serviços e da promoção
     4. Pesquisa e filtros
     5. Animações de revelação ao rolar
     6. Rodapé (contatos vindos do config.js)
     7. Toast (mensagens rápidas) — usado também pelo booking.js
   ========================================================================== */

(function () {
  'use strict';

  const CONFIG = window.PRIME_CONFIG;
  const SERVICOS = window.PRIME_SERVICOS;
  const U = window.PrimeUtils;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Escapa texto antes de inserir como HTML (segurança) */
  const esc = (str) => String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* ========================================================================
     7. TOAST — exposto globalmente para o booking.js
     ======================================================================== */
  const toastEl = $('#toast');
  let toastTimer;
  window.primeToast = function (msg, type = 'info') {
    toastEl.textContent = msg;
    toastEl.classList.toggle('toast--error', type === 'error');
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 4200);
  };

  /* ========================================================================
     1. CABEÇALHO
     ======================================================================== */
  const header = $('#header');
  const nav = $('#nav');
  const menuToggle = $('#menu-toggle');
  const searchForm = $('#search');
  const searchToggle = $('#search-toggle');
  const searchInput = $('#search-input');

  // Sombra no header após rolar um pouco
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Abre/fecha o menu mobile
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('menu-open', open);
    if (open) setSearch(false);
  }
  menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));

  // Abre/fecha a pesquisa no mobile
  function setSearch(open) {
    searchForm.classList.toggle('is-open', open);
    searchToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      setMenu(false);
      setTimeout(() => searchInput.focus(), 50);
    }
  }
  searchToggle.addEventListener('click', () => setSearch(!searchForm.classList.contains('is-open')));

  // Fecha o menu ao clicar em um link ou fora dele / ao pressionar Esc
  $$('.nav__link').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('menu-open') && !nav.contains(e.target) && !menuToggle.contains(e.target)) {
      setMenu(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setMenu(false); setSearch(false); }
  });

  // Destaca no menu a seção que está visível
  const navLinks = $$('.nav__link');
  const sectionIds = navLinks.map((a) => a.getAttribute('href').slice(1));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sectionIds.forEach((id) => { const el = document.getElementById(id); if (el) sectionObserver.observe(el); });

  /* ========================================================================
     2. CARROSSEL
     ======================================================================== */
  (function initCarousel() {
    const root = $('#carousel');
    if (!root) return;

    const slides = $$('.slide', root);
    const dotsWrap = $('.carousel__dots', root);
    const counter = $('.carousel__counter b', root);
    const progress = $('.carousel__progress span', root);
    const INTERVALO = 6000; // tempo de cada slide (ms)
    let atual = 0;
    let timer = null;

    // Cria os indicadores
    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel__dot';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', `Ir para o slide ${i + 1}`);
      b.addEventListener('click', () => { irPara(i); reiniciar(); });
      dotsWrap.appendChild(b);
      return b;
    });

    function irPara(index) {
      const total = slides.length;
      atual = (index + total) % total;
      slides.forEach((s, i) => {
        const ativo = i === atual;
        s.classList.toggle('is-active', ativo);
        s.setAttribute('aria-hidden', String(!ativo));
        // Evita foco em links de slides escondidos
        $$('a, button', s).forEach((el) => (el.tabIndex = ativo ? 0 : -1));
        // Carrega a imagem do próximo slide antecipadamente
        if (i === (atual + 1) % total) { const img = $('img', s); if (img) img.loading = 'eager'; }
      });
      dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === atual)));
      counter.textContent = String(atual + 1).padStart(2, '0');
    }

    function animarProgresso() {
      progress.classList.remove('is-running');
      void progress.offsetWidth; // reinicia a animação CSS
      progress.style.animationDuration = INTERVALO + 'ms';
      progress.classList.add('is-running');
    }

    function iniciar() {
      if (prefersReducedMotion) return;
      parar();
      animarProgresso();
      timer = setInterval(() => { irPara(atual + 1); animarProgresso(); }, INTERVALO);
    }
    function parar() { clearInterval(timer); timer = null; }
    function reiniciar() { iniciar(); }

    $('.carousel__arrow--prev', root).addEventListener('click', () => { irPara(atual - 1); reiniciar(); });
    $('.carousel__arrow--next', root).addEventListener('click', () => { irPara(atual + 1); reiniciar(); });

    // Pausa ao passar o mouse
    root.addEventListener('mouseenter', () => { root.classList.add('is-paused'); parar(); });
    root.addEventListener('mouseleave', () => { root.classList.remove('is-paused'); iniciar(); });

    // Teclado (setas) quando o foco está no carrossel
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { irPara(atual - 1); reiniciar(); }
      if (e.key === 'ArrowRight') { irPara(atual + 1); reiniciar(); }
    });

    // Gesto de arrastar (celular/tablet)
    let startX = 0, startY = 0, arrastando = false;
    root.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; arrastando = true;
    }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (!arrastando) return;
      arrastando = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        irPara(dx < 0 ? atual + 1 : atual - 1);
        reiniciar();
      }
    });

    // Pausa quando a aba não está visível (economiza recursos)
    document.addEventListener('visibilitychange', () => (document.hidden ? parar() : iniciar()));

    irPara(0);
    iniciar();
  })();

  /* ========================================================================
     3. CARDS DE CORTES / SERVIÇOS E PROMOÇÃO
     ======================================================================== */
  const grid = $('#services-grid');
  const iconSeta = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function cardHTML(s) {
    const tipo = s.categoria === 'servico' ? 'Serviço' : 'Corte';
    return `
      <article class="card reveal" data-id="${esc(s.id)}" data-categoria="${esc(s.categoria)}">
        <div class="card__media">
          <img src="${esc(s.imagem)}" alt="${esc(s.nome)}" loading="lazy" width="800" height="640">
          <span class="card__tag ${s.categoria === 'servico' ? 'card__tag--servico' : ''}">${tipo}</span>
        </div>
        <div class="card__body">
          <h3 class="card__title" data-nome="${esc(s.nome)}">${esc(s.nome)}</h3>
          <p class="card__desc">${esc(s.descricao)}</p>
          <div class="card__foot">
            <p class="card__price"><small>A partir de</small><strong>${U.moeda(s.preco)}</strong></p>
            <a href="#agendamento" class="card__btn" data-agendar="${esc(s.id)}">Agendar ${iconSeta}</a>
          </div>
        </div>
      </article>`;
  }

  grid.innerHTML = SERVICOS.filter((s) => s.categoria !== 'promocao').map(cardHTML).join('');

  // Card de promoção (usa o primeiro item com categoria "promocao")
  (function renderPromo() {
    const promocoes = SERVICOS.filter((s) => s.categoria === 'promocao');
    const alvo = $('#promo-card');
    if (!promocoes.length) { alvo.innerHTML = '<p>Nenhuma promoção ativa no momento.</p>'; return; }

    // Card grande: item com "destaque: true" (ou o primeiro da lista)
    const promo = promocoes.find((s) => s.destaque) || promocoes[0];
    const outras = promocoes.filter((s) => s !== promo);

    // Última palavra do nome em destaque: "Corte <span>Platinado</span>"
    const partes = promo.nome.split(' ');
    const ultima = partes.pop();
    const titulo = `${esc(partes.join(' '))} <span>${esc(ultima)}</span>`;

    const final = U.precoFinal(promo);
    const economia = promo.preco - final;

    // Cards menores com as demais promoções
    const miniCards = outras.map((s) => `
      <article class="promo-mini reveal">
        <div class="promo-mini__media">
          <img src="${esc(s.imagem)}" alt="${esc(s.nome)}" loading="lazy" width="800" height="640">
          <span class="promo-mini__off">-${s.desconto}%</span>
        </div>
        <div class="promo-mini__body">
          <h3 class="promo-mini__title">${esc(s.nome)}</h3>
          <p class="promo-mini__desc">${esc(s.descricao)}</p>
          <div class="promo-mini__foot">
            <p class="promo-mini__price"><s>${U.moeda(s.preco)}</s><strong>${U.moeda(U.precoFinal(s))}</strong></p>
            <a href="#agendamento" class="card__btn card__btn--light" data-agendar="${esc(s.id)}">Agendar ${iconSeta}</a>
          </div>
        </div>
      </article>`).join('');

    alvo.innerHTML = `
      <article class="promo-card reveal">
        <div class="promo-card__media">
          <img src="${esc(promo.imagem)}" alt="${esc(promo.nome)}" loading="lazy">
          <div class="badge-off" aria-label="${promo.desconto}% de desconto">
            <strong>${promo.desconto}%</strong><span>OFF</span>
          </div>
        </div>
        <div class="promo-card__body">
          <span class="promo-card__ribbon">Oferta especial</span>
          <h3 class="promo-card__title">${titulo}</h3>
          <p class="promo-card__desc">${esc(promo.descricao)}</p>
          <div class="price-compare">
            <p class="price-compare__old"><small>De</small><s>${U.moeda(promo.preco)}</s></p>
            <p class="price-compare__new"><small>Por</small><strong>${U.moeda(final)}</strong></p>
            <span class="price-compare__save">Economize ${U.moeda(economia)}</span>
          </div>
          <div>
            <a href="#agendamento" class="btn btn--primary btn--lg" data-agendar="${esc(promo.id)}">
              Quero essa oferta ${iconSeta}
            </a>
          </div>
          <p class="promo-card__note">Desconto aplicado automaticamente no agendamento.</p>
        </div>
      </article>
      ${outras.length ? `
        <h3 class="promo-more__title reveal">Mais cortes em promoção</h3>
        <div class="promo-grid">${miniCards}</div>` : ''}`;
  })();

  // Botões "Agendar": pré-seleciona o serviço no formulário
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-agendar]');
    if (!btn) return;
    if (window.PrimeBooking) window.PrimeBooking.selecionarServico(btn.dataset.agendar);
  });

  /* ========================================================================
     4. PESQUISA E FILTROS
     ======================================================================== */
  const cards = $$('.card', grid);
  const statusEl = $('#search-status');
  const emptyEl = $('#empty-state');
  const clearBtn = $('#search-clear');
  const filtros = $$('.filter');
  let filtroAtual = 'todos';
  let jaRolou = false;

  // Destaca o trecho pesquisado no nome do card
  function destacar(nome, termo) {
    if (!termo) return esc(nome);
    const idx = U.normalizar(nome).indexOf(termo);
    if (idx === -1) return esc(nome);
    return esc(nome.slice(0, idx)) +
      '<mark>' + esc(nome.slice(idx, idx + termo.length)) + '</mark>' +
      esc(nome.slice(idx + termo.length));
  }

  function aplicarFiltros() {
    const termo = U.normalizar(searchInput.value);
    let visiveis = 0;

    cards.forEach((card) => {
      const s = U.servicoPorId(card.dataset.id);
      const textoBusca = U.normalizar([s.nome, ...(s.tags || [])].join(' '));
      const passaBusca = !termo || textoBusca.includes(termo);
      const passaFiltro = filtroAtual === 'todos' || s.categoria === filtroAtual;
      const mostrar = passaBusca && passaFiltro;

      card.classList.toggle('is-hidden', !mostrar);
      if (mostrar) {
        visiveis++;
        card.classList.add('is-visible'); // garante que apareça mesmo sem rolar
      }
      $('.card__title', card).innerHTML = destacar(s.nome, termo);
    });

    clearBtn.hidden = !searchInput.value;
    emptyEl.hidden = visiveis > 0;

    if (termo) {
      statusEl.hidden = false;
      statusEl.innerHTML = `<strong>${visiveis}</strong> ${visiveis === 1 ? 'resultado' : 'resultados'} para “${esc(searchInput.value.trim())}”` +
        ' <button type="button" data-limpar>Limpar</button>';
    } else {
      statusEl.hidden = true;
    }
  }

  function rolarParaCortes() {
    const sec = $('#cortes');
    const r = sec.getBoundingClientRect();
    const visivel = r.top < window.innerHeight * .5 && r.bottom > window.innerHeight * .3;
    if (!visivel) sec.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }

  function limparBusca() {
    searchInput.value = '';
    jaRolou = false;
    aplicarFiltros();
  }

  // Filtra enquanto digita (com pequeno atraso para não pesar)
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      aplicarFiltros();
      if (searchInput.value.trim() && !jaRolou) { rolarParaCortes(); jaRolou = true; }
      if (!searchInput.value.trim()) jaRolou = false;
    }, 180);
  });

  // Enter: aplica e leva até os resultados
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    aplicarFiltros();
    rolarParaCortes();
    setSearch(false);
    searchInput.blur();
  });

  clearBtn.addEventListener('click', () => { limparBusca(); searchInput.focus(); });
  $('#empty-clear').addEventListener('click', () => { limparBusca(); filtros[0].click(); });
  statusEl.addEventListener('click', (e) => { if (e.target.matches('[data-limpar]')) limparBusca(); });

  filtros.forEach((btn) => btn.addEventListener('click', () => {
    filtroAtual = btn.dataset.filter;
    filtros.forEach((b) => {
      const ativo = b === btn;
      b.classList.toggle('is-active', ativo);
      b.setAttribute('aria-selected', String(ativo));
    });
    aplicarFiltros();
  }));

  /* ========================================================================
     5. ANIMAÇÕES DE REVELAÇÃO AO ROLAR
     ======================================================================== */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // Pequeno efeito "cascata" entre cards vizinhos
        const el = entry.target;
        const irmaos = el.parentElement ? Array.from(el.parentElement.children) : [];
        const atraso = Math.min(irmaos.indexOf(el) % 4, 3) * 80;
        el.style.transitionDelay = atraso + 'ms';
        el.classList.add('is-visible');
        setTimeout(() => (el.style.transitionDelay = ''), 900 + atraso);
        revealObserver.unobserve(el);
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => revealObserver.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-visible'));
  }

  /* ========================================================================
     6. RODAPÉ
     ======================================================================== */
  (function renderFooter() {
    const ul = $('#footer-contacts');
    const iconInsta = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>';
    const iconMail = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';

    const insta = (CONFIG.instagram || '').replace(/^@/, '').trim();
    const email = (CONFIG.email || '').trim();

    ul.innerHTML = `
      <li>${insta
        ? `<a href="https://instagram.com/${encodeURIComponent(insta)}" target="_blank" rel="noopener">${iconInsta} @${esc(insta)}</a>`
        : `<span class="is-pending">${iconInsta} Instagram em breve</span>`}</li>
      <li>${email
        ? `<a href="mailto:${esc(email)}">${iconMail} ${esc(email)}</a>`
        : `<span class="is-pending">${iconMail} E-mail em breve</span>`}</li>`;

    $('#year').textContent = new Date().getFullYear();
  })();
})();
