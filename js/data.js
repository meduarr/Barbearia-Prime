/* ==========================================================================
   BARBEARIA PRIME — CATÁLOGO DE CORTES E SERVIÇOS
   --------------------------------------------------------------------------
   Para adicionar, remover ou alterar um serviço, edite a lista abaixo.
   Os cards, a busca, a promoção e o formulário de agendamento são gerados
   automaticamente a partir destes dados.

   ⚠ Os PREÇOS abaixo são valores de referência de mercado.
     Ajuste-os para a tabela real da barbearia antes de publicar.

   Campos:
     id          identificador único (sem espaços/acentos)
     nome        nome exibido e usado na busca
     categoria   'corte' | 'servico' | 'promocao'
     preco       valor em reais (número)
     descricao   texto curto do card
     imagem      caminho da foto
     tags        palavras extras que também ajudam na busca
     desconto    (só promoções) percentual de desconto
   ========================================================================== */

window.PRIME_SERVICOS = [
  /* ----------------------------- CORTES ---------------------------------- */
  {
    id: 'low-fade',
    nome: 'Degradê Baixo (Low Fade)',
    categoria: 'corte',
    preco: 45,
    descricao: 'Transição suave que começa rente à nuca e às costeletas. Discreto e elegante.',
    imagem: 'assets/img/servicos/low-fade.jpg',
    tags: ['degrade', 'fade', 'low']
  },
  {
    id: 'mid-fade',
    nome: 'Degradê Médio (Mid Fade)',
    categoria: 'corte',
    preco: 45,
    descricao: 'O degradê começa na altura das têmporas. Equilíbrio entre o clássico e o moderno.',
    imagem: 'assets/img/servicos/mid-fade.jpg',
    tags: ['degrade', 'fade', 'mid', 'medio']
  },
  {
    id: 'high-fade',
    nome: 'Degradê Alto (High Fade)',
    categoria: 'corte',
    preco: 45,
    descricao: 'Laterais bem curtas até o alto da cabeça, com contraste marcante no topo.',
    imagem: 'assets/img/servicos/high-fade.jpg',
    tags: ['degrade', 'fade', 'high', 'alto']
  },
  {
    id: 'americano',
    nome: 'Corte Americano',
    categoria: 'corte',
    preco: 40,
    descricao: 'Laterais batidas, topo com volume e risca definida. Atemporal e versátil.',
    imagem: 'assets/img/servicos/americano.jpg',
    tags: ['americano', 'risca']
  },
  {
    id: 'social',
    nome: 'Corte Social',
    categoria: 'corte',
    preco: 35,
    descricao: 'Acabamento alinhado e natural, ideal para o dia a dia e o ambiente profissional.',
    imagem: 'assets/img/servicos/social.jpg',
    tags: ['social', 'classico', 'executivo']
  },
  {
    id: 'militar',
    nome: 'Corte Militar',
    categoria: 'corte',
    preco: 30,
    descricao: 'Curto e prático, feito na máquina. Visual limpo com manutenção mínima.',
    imagem: 'assets/img/servicos/militar.jpg',
    tags: ['militar', 'maquina', 'buzz', 'curto']
  },
  {
    id: 'tesoura',
    nome: 'Corte na Tesoura',
    categoria: 'corte',
    preco: 50,
    descricao: 'Feito 100% na tesoura para um caimento natural e textura personalizada.',
    imagem: 'assets/img/servicos/tesoura.jpg',
    tags: ['tesoura', 'classico']
  },
  {
    id: 'crop',
    nome: 'Crop Texturizado',
    categoria: 'corte',
    preco: 45,
    descricao: 'Franja curta e textura no topo, combinada com laterais em degradê.',
    imagem: 'assets/img/servicos/crop.jpg',
    tags: ['crop', 'texturizado', 'franja', 'french crop']
  },
  {
    id: 'topete',
    nome: 'Topete (Quiff)',
    categoria: 'corte',
    preco: 50,
    descricao: 'Volume na frente, penteado para cima e para trás. Presença e personalidade.',
    imagem: 'assets/img/servicos/topete.jpg',
    tags: ['topete', 'quiff', 'pompadour', 'volume']
  },
  {
    id: 'infantil',
    nome: 'Corte Infantil',
    categoria: 'corte',
    preco: 35,
    descricao: 'Corte com paciência e cuidado para os pequenos, no estilo que eles preferirem.',
    imagem: 'assets/img/servicos/infantil.jpg',
    tags: ['infantil', 'crianca', 'kids']
  },

  /* --------------------------- SERVIÇOS ADICIONAIS ----------------------- */
  {
    id: 'barba',
    nome: 'Barba',
    categoria: 'servico',
    preco: 35,
    descricao: 'Modelagem, alinhamento na navalha e toalha quente para um acabamento impecável.',
    imagem: 'assets/img/servicos/barba.jpg',
    tags: ['barba', 'navalha', 'toalha quente']
  },
  {
    id: 'escova',
    nome: 'Escova',
    categoria: 'servico',
    preco: 25,
    descricao: 'Secagem e modelagem com escova para dar forma, volume e alinhamento aos fios.',
    imagem: 'assets/img/servicos/escova.jpg',
    tags: ['escova', 'secador', 'finalizacao']
  },

  /* ------------------------------ PROMOÇÕES ------------------------------
     destaque: true → aparece no card grande. As demais aparecem abaixo,
     em cards menores. Para encerrar uma promoção, basta remover o item.
     ----------------------------------------------------------------------- */
  {
    id: 'platinado',
    nome: 'Corte Platinado',
    categoria: 'promocao',
    destaque: true,
    preco: 120,
    desconto: 10,
    descricao: 'Descoloração global até o tom platinado, matização e corte à sua escolha. ' +
               'Um visual que não passa despercebido.',
    imagem: 'assets/img/servicos/platinado.jpg',
    tags: ['platinado', 'nevou', 'descoloracao', 'loiro', 'promocao']
  },
  {
    id: 'combo-corte-barba',
    nome: 'Combo Corte + Barba',
    categoria: 'promocao',
    preco: 80,
    desconto: 15,
    descricao: 'Corte à sua escolha e barba completa com navalha e toalha quente.',
    imagem: 'assets/img/servicos/promo-combo-barba.jpg',
    tags: ['combo', 'corte', 'barba', 'promocao']
  },
  {
    id: 'combo-degrade-escova',
    nome: 'Degradê + Escova',
    categoria: 'promocao',
    preco: 70,
    desconto: 10,
    descricao: 'Low, mid ou high fade com finalização na escova para sair pronto.',
    imagem: 'assets/img/servicos/promo-degrade-escova.jpg',
    tags: ['combo', 'degrade', 'fade', 'escova', 'promocao']
  },
  {
    id: 'combo-completo',
    nome: 'Combo Completo',
    categoria: 'promocao',
    preco: 105,
    desconto: 20,
    descricao: 'Corte + barba + escova. O pacote completo para renovar o visual.',
    imagem: 'assets/img/servicos/promo-completo.jpg',
    tags: ['combo', 'completo', 'corte', 'barba', 'escova', 'promocao']
  }
];

/* --------------------------------------------------------------------------
   Utilitários compartilhados entre os scripts
   -------------------------------------------------------------------------- */
window.PrimeUtils = {
  /** Formata número como moeda brasileira. Ex.: 45 -> "R$ 45,00" */
  moeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },

  /** Preço final, já aplicando desconto quando existir. */
  precoFinal(servico) {
    if (!servico.desconto) return servico.preco;
    return Math.round(servico.preco * (100 - servico.desconto)) / 100;
  },

  /** Remove acentos e deixa minúsculo — usado na busca. */
  normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  },

  /** Busca um serviço pelo id. */
  servicoPorId(id) {
    return window.PRIME_SERVICOS.find((s) => s.id === id);
  }
};
