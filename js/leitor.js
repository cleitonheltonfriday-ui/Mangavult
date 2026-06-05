// ═══════════════════════════════════════════════
//  leitor.js — Leitor de páginas estilo MangaDex
// ═══════════════════════════════════════════════

const ConfigPadrao = {
  doublePage: true,
  offsetSpreads: true,
  fitMode: 'fitBoth',   // 'fitWidth' | 'fitHeight' | 'fitBoth'
  rtl: true,
  headerHidden: false,
  progressHidden: false,
};

let cfg = { ...ConfigPadrao };
let paginas = [];        // array de blob URLs
let spreads = [];        // array de pares [[0],[1,2],[3,4]...]
let spreadIdx = 0;       // índice do spread atual
let obraIdAtual = null;
let capIdAtual = null;
let obraAtual = null;

// ───────────────── Abrir capítulo ─────────────────
async function abrirCapitulo(obraId, capId) {
  obraIdAtual = obraId;
  capIdAtual = capId;
  obraAtual = await DB.buscarObra(obraId);

  // Salvar progresso na obra
  obraAtual.ultimoCapId = capId;
  await DB.salvarObra(obraAtual);

  const cap = obraAtual.capitulos.find(c => c.id === capId);

  // Carregar blobs
  const blobs = await DB.buscarPaginasCap(capId);
  // Revogar URLs antigas
  paginas.forEach(u => URL.revokeObjectURL(u));
  paginas = blobs.map(b => URL.createObjectURL(b));

  // Carregar config salva
  const cfgSalva = JSON.parse(localStorage.getItem('mvCfg') || '{}');
  cfg = { ...ConfigPadrao, ...cfgSalva };

  calcularSpreads();
  spreadIdx = 0;

  // Header
  document.getElementById('leitor-obra-nome').textContent = obraAtual.titulo;
  document.getElementById('leitor-cap-badge').textContent =
    `Ch. ${cap?.numero ?? ''}`;
  document.getElementById('painel-obra-nome').textContent = obraAtual.titulo;
  document.getElementById('painel-cap-nome').textContent = `Capítulo ${cap?.numero ?? ''}`;
  document.getElementById('painel-cap-val').textContent = `Capítulo ${cap?.numero ?? ''}`;

  // Slider
  const slider = document.getElementById('progresso-slider');
  slider.min = 0;
  slider.max = spreads.length - 1;
  slider.value = 0;

  aplicarConfig();
  renderizarSpread();
  mostrarTela('tela-leitor');
}

// ───────────────── Calcular spreads ─────────────────
function calcularSpreads() {
  spreads = [];
  const total = paginas.length;
  if (!total) return;

  if (!cfg.doublePage) {
    // Página única
    for (let i = 0; i < total; i++) spreads.push([i]);
    return;
  }

  if (cfg.offsetSpreads) {
    // Primeira página sozinha, depois pares
    spreads.push([0]);
    for (let i = 1; i < total; i += 2) {
      if (i + 1 < total) spreads.push([i, i + 1]);
      else spreads.push([i]);
    }
  } else {
    // Pares diretos sem offset
    for (let i = 0; i < total; i += 2) {
      if (i + 1 < total) spreads.push([i, i + 1]);
      else spreads.push([i]);
    }
  }
}

// ───────────────── Renderizar spread atual ─────────────────
function renderizarSpread() {
  const viewport = document.getElementById('leitor-viewport');
  const container = document.getElementById('leitor-paginas');
  container.innerHTML = '';

  const spread = spreads[spreadIdx];
  if (!spread) return;

  const isDupla = spread.length === 2;
  container.classList.toggle('dupla', isDupla);

  // Em RTL, exibir páginas em ordem invertida (página direita primeiro visualmente)
  const ordem = cfg.rtl && isDupla ? [...spread].reverse() : spread;

  ordem.forEach(idx => {
    const img = document.createElement('img');
    img.className = 'pagina-img';
    img.src = paginas[idx];
    img.draggable = false;
    container.appendChild(img);
  });

  atualizarUI();
}

// ───────────────── Navegação ─────────────────
function irParaSpread(idx) {
  if (idx < 0 || idx >= spreads.length) return;
  spreadIdx = idx;
  document.getElementById('progresso-slider').value = idx;
  renderizarSpread();
}

function avancar() {
  if (spreadIdx < spreads.length - 1) irParaSpread(spreadIdx + 1);
}
function recuar() {
  if (spreadIdx > 0) irParaSpread(spreadIdx - 1);
}

// ───────────────── Atualizar UI ─────────────────
function atualizarUI() {
  const spread = spreads[spreadIdx] ?? [];
  const nums = spread.map(i => i + 1);
  const label = nums.length === 2
    ? (cfg.rtl ? `${nums[1]}-${nums[0]}` : `${nums[0]}-${nums[1]}`)
    : `${nums[0]}`;
  const total = paginas.length;

  document.getElementById('leitor-pg-badge').textContent = `Pg. ${label} / ${total}`;
  document.getElementById('painel-pag-val').textContent = label;
  document.getElementById('progresso-nums').textContent = `${label} / ${total}`;
  document.getElementById('progresso-slider').value = spreadIdx;
  document.getElementById('progresso-slider').max = spreads.length - 1;
}

// ───────────────── Config ─────────────────
function salvarConfig() {
  localStorage.setItem('mvCfg', JSON.stringify(cfg));
}

function aplicarConfig() {
  const viewport = document.getElementById('leitor-viewport');

  // Fit mode
  viewport.classList.remove('fit-width', 'fit-height', 'fit-both');
  viewport.classList.add(
    cfg.fitMode === 'fitWidth' ? 'fit-width' :
    cfg.fitMode === 'fitHeight' ? 'fit-height' : 'fit-both'
  );

  // Dupla
  if (!cfg.doublePage) viewport.classList.remove('fit-both');

  // Header / Footer
  document.getElementById('leitor-header').classList.toggle('oculto', cfg.headerHidden);
  document.getElementById('leitor-footer').classList.toggle('oculto', cfg.progressHidden);

  // Botões do painel
  atualizarBotoesPainel();

  // Fit label
  document.getElementById('opt-fit-label').textContent =
    cfg.fitMode === 'fitWidth' ? 'Fit Width' :
    cfg.fitMode === 'fitHeight' ? 'Fit Height' : 'Fit Both';
}

function atualizarBotoesPainel() {
  const mapa = {
    'opt-double-page': cfg.doublePage,
    'opt-offset': cfg.offsetSpreads,
    'opt-rtl': cfg.rtl,
    'opt-header': cfg.headerHidden,
    'opt-progress': cfg.progressHidden,
  };
  Object.entries(mapa).forEach(([id, ativo]) => {
    document.getElementById(id)?.classList.toggle('ativo', ativo);
  });
}

function toggleOpcao(opt) {
  if (opt === 'fitMode') {
    const modos = ['fitBoth', 'fitWidth', 'fitHeight'];
    const idx = modos.indexOf(cfg.fitMode);
    cfg.fitMode = modos[(idx + 1) % modos.length];
  } else {
    cfg[opt] = !cfg[opt];
  }
  salvarConfig();
  calcularSpreads();
  // Manter posição aproximada
  spreadIdx = Math.min(spreadIdx, spreads.length - 1);
  aplicarConfig();
  renderizarSpread();
}

// ───────────────── Painel lateral ─────────────────
function abrirPainel() {
  document.getElementById('painel-lateral').classList.add('aberto');
  document.getElementById('painel-overlay').classList.add('ativo');
}
function fecharPainel() {
  document.getElementById('painel-lateral').classList.remove('aberto');
  document.getElementById('painel-overlay').classList.remove('ativo');
}

// ───────────────── Navegar entre capítulos ─────────────────
function capAtualIndex() {
  if (!obraAtual) return -1;
  return obraAtual.capitulos.findIndex(c => c.id === capIdAtual);
}

async function irCapituloPrev() {
  const idx = capAtualIndex();
  if (idx <= 0) { mostrarToast('Primeiro capítulo'); return; }
  fecharPainel();
  await abrirCapitulo(obraIdAtual, obraAtual.capitulos[idx - 1].id);
}

async function irCapituloNext() {
  const idx = capAtualIndex();
  if (idx >= obraAtual.capitulos.length - 1) { mostrarToast('Último capítulo'); return; }
  fecharPainel();
  await abrirCapitulo(obraIdAtual, obraAtual.capitulos[idx + 1].id);
}

// ───────────────── Eventos ─────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Zonas de toque
  document.getElementById('zona-esq').addEventListener('click', () => {
    cfg.rtl ? avancar() : recuar();
  });
  document.getElementById('zona-dir').addEventListener('click', () => {
    cfg.rtl ? recuar() : avancar();
  });

  // Setas de navegação
  document.getElementById('nav-prev').addEventListener('click', recuar);
  document.getElementById('nav-next').addEventListener('click', avancar);

  // Slider
  document.getElementById('progresso-slider').addEventListener('input', e => {
    irParaSpread(parseInt(e.target.value));
  });

  // Abrir/fechar painel
  document.getElementById('btn-abrir-menu-leitor').addEventListener('click', abrirPainel);
  document.getElementById('btn-menu-leitor-pill').addEventListener('click', abrirPainel);
  document.getElementById('btn-fechar-painel').addEventListener('click', fecharPainel);
  document.getElementById('painel-overlay').addEventListener('click', fecharPainel);

  // Opções do painel
  document.getElementById('opt-double-page').addEventListener('click', () => toggleOpcao('doublePage'));
  document.getElementById('opt-offset').addEventListener('click', () => toggleOpcao('offsetSpreads'));
  document.getElementById('opt-fit').addEventListener('click', () => toggleOpcao('fitMode'));
  document.getElementById('opt-rtl').addEventListener('click', () => toggleOpcao('rtl'));
  document.getElementById('opt-header').addEventListener('click', () => toggleOpcao('headerHidden'));
  document.getElementById('opt-progress').addEventListener('click', () => toggleOpcao('progressHidden'));

  // Nav páginas no painel
  document.getElementById('painel-prev-pag').addEventListener('click', () => { fecharPainel(); recuar(); });
  document.getElementById('painel-next-pag').addEventListener('click', () => { fecharPainel(); avancar(); });

  // Nav capítulos no painel
  document.getElementById('painel-prev-cap').addEventListener('click', irCapituloPrev);
  document.getElementById('painel-next-cap').addEventListener('click', irCapituloNext);

  // Voltar para biblioteca
  document.getElementById('btn-voltar-biblioteca').addEventListener('click', () => {
    mostrarTela('tela-biblioteca');
    Biblioteca.renderizarBiblioteca();
  });

  // Toque central (área média) para mostrar/ocultar header quando header hidden
  document.getElementById('leitor-viewport').addEventListener('click', e => {
    // Só reage no centro (não nas zonas de toque laterais)
    const x = e.clientX / window.innerWidth;
    if (x > 0.15 && x < 0.85) {
      // Toggle UI se estiver em modo header hidden
      if (cfg.headerHidden) {
        const h = document.getElementById('leitor-header');
        h.classList.toggle('oculto');
      }
    }
  });

  // Teclado (desktop)
  document.addEventListener('keydown', e => {
    if (document.getElementById('tela-leitor').classList.contains('ativa')) {
      if (e.key === 'ArrowLeft') cfg.rtl ? avancar() : recuar();
      if (e.key === 'ArrowRight') cfg.rtl ? recuar() : avancar();
    }
  });
});

window.Leitor = { abrirCapitulo };
