// ═══════════════════════════════════════════════
//  leitor.js — v3 (todos os bugs corrigidos)
// ═══════════════════════════════════════════════

const ConfigPadrao = {
  doublePage:     true,
  offsetSpreads:  true,
  fitMode:        'fitBoth',   // fitBoth | fitWidth | fitHeight
  rtl:            true,
  headerHidden:   false,
  progressHidden: false,
};

let cfg        = { ...ConfigPadrao };
let paginas    = [];   // blob URLs
let imgSizes   = [];   // { w, h } por página
let spreads    = [];   // [[0], [1,2], [3,4], …]
let spreadIdx  = 0;
let obraIdAtual = null;
let capIdAtual  = null;
let obraAtual   = null;

// ── Zoom state ──
let zoomScale = 1, zoomLastScale = 1;
let zoomOriginX = 0, zoomOriginY = 0;
let zoomPanX = 0, zoomPanY = 0;
let zoomLastPanX = 0, zoomLastPanY = 0;
let zoomIsPinching = false;
let zoomPinchDist  = 0;
let zoomLastTap    = 0;

// ════════════════════════════════════════════
//  ABRIR CAPÍTULO
// ════════════════════════════════════════════
async function abrirCapitulo(obraId, capId) {
  obraIdAtual = obraId;
  capIdAtual  = capId;
  obraAtual   = await DB.buscarObra(obraId);
  obraAtual.ultimoCapId = capId;
  await DB.salvarObra(obraAtual);

  const cap = obraAtual.capitulos.find(c => c.id === capId);

  // Revogar URLs antigas
  paginas.forEach(u => URL.revokeObjectURL(u));
  const blobs = await DB.buscarPaginasCap(capId);
  paginas = blobs.map(b => URL.createObjectURL(b));

  // Medir páginas para detectar especiais
  imgSizes = await medirPaginas(paginas);

  // Carregar config
  const cfgSalva = JSON.parse(localStorage.getItem('mvCfg') || '{}');
  cfg = { ...ConfigPadrao, ...cfgSalva };

  calcularSpreads();
  spreadIdx = 0;
  resetZoom();

  // Preencher UI
  document.getElementById('leitor-obra-nome').textContent = obraAtual.titulo;
  document.getElementById('leitor-cap-badge').textContent = `Ch. ${cap?.numero ?? ''}`;
  document.getElementById('painel-obra-nome').textContent = obraAtual.titulo;
  document.getElementById('painel-cap-nome').textContent  = `Capítulo ${cap?.numero ?? ''}`;
  document.getElementById('painel-cap-val').textContent   = `Capítulo ${cap?.numero ?? ''}`;

  aplicarConfig();
  await renderizarSpread();
  mostrarTela('tela-leitor');
}

// ════════════════════════════════════════════
//  MEDIR PÁGINAS
// ════════════════════════════════════════════
function medirPaginas(urls) {
  return Promise.all(urls.map(url => new Promise(res => {
    const img = new Image();
    img.onload  = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => res({ w: 800, h: 1200 });
    img.src = url;
  })));
}

// ════════════════════════════════════════════
//  DETECTAR PÁGINA ESPECIAL (créditos, wide, etc.)
// ════════════════════════════════════════════
function paginaEspecial(idx) {
  const s = imgSizes[idx];
  if (!s || s.w === 0 || s.h === 0) return false;
  const ratio  = s.w / s.h;
  const ratios = imgSizes.map(x => x.h > 0 ? x.w / x.h : 0).filter(r => r > 0).sort((a,b)=>a-b);
  const med    = ratios[Math.floor(ratios.length / 2)] || 0.7;
  return Math.abs(ratio - med) / med > 0.4;
}

// ════════════════════════════════════════════
//  CALCULAR SPREADS
// ════════════════════════════════════════════
function calcularSpreads() {
  spreads = [];
  const total = paginas.length;
  if (!total) return;

  if (!cfg.doublePage) {
    for (let i = 0; i < total; i++) spreads.push([i]);
    return;
  }

  if (cfg.offsetSpreads) {
    spreads.push([0]);
    let i = 1;
    while (i < total) {
      if (paginaEspecial(i) || i + 1 >= total || paginaEspecial(i+1)) {
        spreads.push([i]); i++;
      } else {
        spreads.push([i, i+1]); i += 2;
      }
    }
  } else {
    let i = 0;
    while (i < total) {
      if (paginaEspecial(i) || i + 1 >= total || paginaEspecial(i+1)) {
        spreads.push([i]); i++;
      } else {
        spreads.push([i, i+1]); i += 2;
      }
    }
  }
}

// ════════════════════════════════════════════
//  RENDERIZAR SPREAD (sem flash preto)
// ════════════════════════════════════════════
async function renderizarSpread() {
  const container = document.getElementById('leitor-paginas');
  const spread    = spreads[spreadIdx];
  if (!spread) return;

  const isDupla = spread.length === 2;
  const ordem   = cfg.rtl && isDupla ? [...spread].reverse() : spread;

  // Pré-carregar ANTES de mostrar — elimina o flash preto
  await Promise.all(ordem.map(i => new Promise(res => {
    const img = new Image();
    img.onload = res; img.onerror = res;
    img.src = paginas[i];
  })));

  container.innerHTML = '';
  container.classList.toggle('dupla', isDupla);

  ordem.forEach(i => {
    const img = document.createElement('img');
    img.className  = 'pagina-img';
    img.src        = paginas[i];
    img.draggable  = false;
    container.appendChild(img);
  });

  atualizarUI();
  precarregarProximo();
}

// Pré-carregar o próximo spread em background
function precarregarProximo() {
  const preload = document.getElementById('leitor-preload');
  preload.innerHTML = '';
  const next = spreads[spreadIdx + 1];
  if (!next) return;
  next.forEach(i => {
    const img = new Image();
    img.src = paginas[i];
    preload.appendChild(img);
  });
}

// ════════════════════════════════════════════
//  NAVEGAÇÃO
// ════════════════════════════════════════════
async function irParaSpread(idx) {
  if (idx < 0 || idx >= spreads.length) return;
  resetZoom();
  spreadIdx = idx;
  document.getElementById('progresso-slider').value = idx;
  await renderizarSpread();
}

async function avancar() {
  if (spreadIdx < spreads.length - 1) {
    await irParaSpread(spreadIdx + 1);
  }
  // Verificar fim ao chegar na última página OU tentar passar dela
  if (spreadIdx === spreads.length - 1) {
    mostrarFimCapitulo();
  }
}

async function recuar() {
  if (spreadIdx > 0) await irParaSpread(spreadIdx - 1);
}

// ════════════════════════════════════════════
//  ATUALIZAR UI (badges + slider)
// ════════════════════════════════════════════
function atualizarUI() {
  const spread = spreads[spreadIdx] ?? [];
  const nums   = spread.map(i => i + 1);
  const label  = nums.length === 2
    ? (cfg.rtl ? `${nums[1]}-${nums[0]}` : `${nums[0]}-${nums[1]}`)
    : `${nums[0]}`;
  const total = paginas.length;

  document.getElementById('leitor-pg-badge').textContent  = `Pg. ${label} / ${total}`;
  document.getElementById('painel-pag-val').textContent   = label;
  document.getElementById('progresso-nums').textContent   = `${label} / ${total}`;
  document.getElementById('progresso-slider').value       = spreadIdx;
  document.getElementById('progresso-slider').max         = spreads.length - 1;
  // Slider RTL
  document.getElementById('progresso-slider').classList.toggle('rtl-slider', cfg.rtl);
}

// ════════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════════
function salvarConfig() { localStorage.setItem('mvCfg', JSON.stringify(cfg)); }

function aplicarConfig() {
  const vp = document.getElementById('leitor-viewport');
  vp.classList.remove('fit-width','fit-height','fit-both');
  vp.classList.add(
    cfg.fitMode === 'fitWidth'  ? 'fit-width'  :
    cfg.fitMode === 'fitHeight' ? 'fit-height' : 'fit-both'
  );

  // Barras: se a opção estiver ATIVA (hidden), oculta permanentemente
  document.getElementById('leitor-header').classList.toggle('oculto', cfg.headerHidden);
  document.getElementById('leitor-footer').classList.toggle('oculto', cfg.progressHidden);
  // Limpar flag de temp oculto
  document.getElementById('leitor-header').dataset.tempOculto = '0';

  atualizarBotoesPainel();

  document.getElementById('opt-fit-label').textContent =
    cfg.fitMode === 'fitWidth'  ? 'Fit Width'  :
    cfg.fitMode === 'fitHeight' ? 'Fit Height' : 'Fit Both';
}

function atualizarBotoesPainel() {
  const mapa = {
    'opt-double-page': cfg.doublePage,
    'opt-offset':      cfg.offsetSpreads,
    'opt-rtl':         cfg.rtl,
    'opt-header':      cfg.headerHidden,
    'opt-progress':    cfg.progressHidden,
  };
  Object.entries(mapa).forEach(([id, ativo]) => {
    document.getElementById(id)?.classList.toggle('ativo', ativo);
  });
}

async function toggleOpcao(opt) {
  if (opt === 'fitMode') {
    const modos = ['fitBoth','fitWidth','fitHeight'];
    cfg.fitMode = modos[(modos.indexOf(cfg.fitMode) + 1) % modos.length];
  } else {
    cfg[opt] = !cfg[opt];
  }
  salvarConfig();
  calcularSpreads();
  spreadIdx = Math.min(spreadIdx, spreads.length - 1);
  aplicarConfig();
  await renderizarSpread();
}

// ════════════════════════════════════════════
//  PAINEL LATERAL
// ════════════════════════════════════════════
function abrirPainel() {
  document.getElementById('painel-lateral').classList.add('aberto');
  document.getElementById('painel-overlay').classList.add('ativo');
}
function fecharPainel() {
  document.getElementById('painel-lateral').classList.remove('aberto');
  document.getElementById('painel-overlay').classList.remove('ativo');
}

// ════════════════════════════════════════════
//  NAVEGAR ENTRE CAPÍTULOS
// ════════════════════════════════════════════
function capIdx() {
  return obraAtual?.capitulos.findIndex(c => c.id === capIdAtual) ?? -1;
}
async function irCapituloPrev() {
  const i = capIdx();
  if (i <= 0) { mostrarToast('Primeiro capítulo'); return; }
  fecharPainel();
  await abrirCapitulo(obraIdAtual, obraAtual.capitulos[i-1].id);
}
async function irCapituloNext() {
  const i = capIdx();
  if (i >= obraAtual.capitulos.length - 1) { mostrarToast('Último capítulo'); return; }
  fecharPainel();
  await abrirCapitulo(obraIdAtual, obraAtual.capitulos[i+1].id);
}

// ════════════════════════════════════════════
//  FIM DE CAPÍTULO
// ════════════════════════════════════════════
let _fimMostrado = false; // evitar mostrar duas vezes

function mostrarFimCapitulo() {
  if (_fimMostrado) return;
  _fimMostrado = true;

  // Remover overlay anterior se existir
  document.getElementById('fim-capitulo-overlay')?.remove();

  const i         = capIdx();
  const temProximo = i >= 0 && i < (obraAtual?.capitulos.length ?? 0) - 1;

  const overlay = document.createElement('div');
  overlay.id = 'fim-capitulo-overlay';
  overlay.innerHTML = `
    <div class="fim-cap-bg"></div>
    <div class="fim-cap-content">
      <div class="fim-cap-check">✓</div>
      <div class="fim-cap-titulo">Capítulo concluído!</div>
      <div class="fim-cap-sub">${obraAtual?.titulo ?? ''} · Cap. ${obraAtual?.capitulos[i]?.numero ?? ''}</div>
      <div class="fim-cap-botoes">
        <button class="fim-cap-btn fim-cap-btn-sec" id="fim-voltar-menu">← Menu</button>
        <button class="fim-cap-btn fim-cap-btn-pri" id="fim-proximo">
          ${temProximo ? 'Próximo Cap. →' : '+ Importar Cap.'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visivel'));

  overlay.querySelector('#fim-voltar-menu').addEventListener('click', () => {
    overlay.remove(); _fimMostrado = false;
    mostrarTela('tela-biblioteca');
    Biblioteca.renderizarBiblioteca();
  });

  overlay.querySelector('#fim-proximo').addEventListener('click', async () => {
    overlay.remove(); _fimMostrado = false;
    if (temProximo) {
      await abrirCapitulo(obraIdAtual, obraAtual.capitulos[i+1].id);
    } else {
      const cap  = obraAtual?.capitulos[i];
      const prox = cap ? String(parseFloat(cap.numero) + 1) : '';
      window._importPreset = { nomeObra: obraAtual?.titulo ?? '', capitulo: prox };
      mostrarTela('tela-biblioteca');
      await Biblioteca.renderizarBiblioteca();
      setTimeout(() => document.getElementById('modal-importar').style.display = 'flex', 300);
    }
  });
}

// ════════════════════════════════════════════
//  ZOOM
// ════════════════════════════════════════════
function aplicarZoom() {
  const c = document.getElementById('leitor-paginas');
  c.style.transform       = `translate(${zoomPanX}px,${zoomPanY}px) scale(${zoomScale})`;
  c.style.transformOrigin = `${zoomOriginX}px ${zoomOriginY}px`;
}

function resetZoom() {
  zoomScale = 1; zoomPanX = 0; zoomPanY = 0;
  zoomLastPanX = 0; zoomLastPanY = 0;
  const c = document.getElementById('leitor-paginas');
  if (c) { c.style.transform = ''; c.style.transformOrigin = ''; }
}

// ════════════════════════════════════════════
//  READER SETTINGS (tela completa)
// ════════════════════════════════════════════
function abrirReaderSettings() {
  fecharPainel();
  document.getElementById('modal-reader-settings').style.display = 'flex';
  sincronizarReaderSettings();
}

function sincronizarReaderSettings() {
  // Page layout
  document.querySelectorAll('.rs-layout-btn').forEach(b => {
    b.classList.toggle('ativo', b.dataset.val === (cfg.doublePage ? 'dupla' : 'simples'));
  });
  // Offset
  document.getElementById('rs-offset').classList.toggle('ativo', cfg.offsetSpreads);
  // Fit
  document.querySelectorAll('.rs-fit-btn').forEach(b => {
    b.classList.toggle('ativo', b.dataset.val === cfg.fitMode);
  });
  // Direção
  document.querySelectorAll('.rs-dir-btn').forEach(b => {
    b.classList.toggle('ativo', b.dataset.val === (cfg.rtl ? 'rtl' : 'ltr'));
  });
  // Header / Progress
  document.querySelectorAll('.rs-header-btn').forEach(b => {
    b.classList.toggle('ativo', b.dataset.val === (cfg.headerHidden ? 'oculto' : 'visivel'));
  });
  document.querySelectorAll('.rs-progress-btn').forEach(b => {
    b.classList.toggle('ativo', b.dataset.val === (cfg.progressHidden ? 'oculto' : 'visivel'));
  });
}

// ════════════════════════════════════════════
//  EVENTOS
// ════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Zonas de toque (lateral) — só age se sem zoom
  document.getElementById('zona-esq').addEventListener('click', () => {
    if (zoomScale > 1.05) return;
    cfg.rtl ? avancar() : recuar();
  });
  document.getElementById('zona-dir').addEventListener('click', () => {
    if (zoomScale > 1.05) return;
    cfg.rtl ? recuar() : avancar();
  });

  // Toque CENTRAL: toggle barras (não navega)
  document.getElementById('leitor-viewport').addEventListener('click', e => {
    if (zoomScale > 1.05) return; // com zoom, não faz nada
    const x = e.clientX / window.innerWidth;
    if (x <= 0.15 || x >= 0.85) return; // zona lateral
    const header = document.getElementById('leitor-header');
    const footer = document.getElementById('leitor-footer');
    const tempOculto = header.dataset.tempOculto === '1';
    if (tempOculto) {
      // Restaurar ao estado da config
      header.classList.toggle('oculto', cfg.headerHidden);
      footer.classList.toggle('oculto', cfg.progressHidden);
      header.dataset.tempOculto = '0';
    } else {
      // Ocultar temporariamente (independente da config)
      header.classList.add('oculto');
      footer.classList.add('oculto');
      header.dataset.tempOculto = '1';
    }
  });

  // Footer arrows
  document.getElementById('nav-prev').addEventListener('click', recuar);
  document.getElementById('nav-next').addEventListener('click', avancar);

  // Slider
  document.getElementById('progresso-slider').addEventListener('input', async e => {
    await irParaSpread(parseInt(e.target.value));
    if (spreadIdx === spreads.length - 1) mostrarFimCapitulo();
  });

  // Painel
  document.getElementById('btn-abrir-menu-leitor').addEventListener('click', abrirPainel);
  document.getElementById('btn-menu-leitor-pill').addEventListener('click', abrirPainel);
  document.getElementById('btn-fechar-painel').addEventListener('click', fecharPainel);
  document.getElementById('painel-overlay').addEventListener('click', fecharPainel);

  // Opções rápidas no painel
  document.getElementById('opt-double-page').addEventListener('click', () => toggleOpcao('doublePage'));
  document.getElementById('opt-offset').addEventListener('click',      () => toggleOpcao('offsetSpreads'));
  document.getElementById('opt-fit').addEventListener('click',         () => toggleOpcao('fitMode'));
  document.getElementById('opt-rtl').addEventListener('click',         () => toggleOpcao('rtl'));
  document.getElementById('opt-header').addEventListener('click',      () => toggleOpcao('headerHidden'));
  document.getElementById('opt-progress').addEventListener('click',    () => toggleOpcao('progressHidden'));
  document.getElementById('opt-reader-settings').addEventListener('click', abrirReaderSettings);

  // Nav painel
  document.getElementById('painel-prev-pag').addEventListener('click', () => { fecharPainel(); recuar(); });
  document.getElementById('painel-next-pag').addEventListener('click', () => { fecharPainel(); avancar(); });
  document.getElementById('painel-prev-cap').addEventListener('click', irCapituloPrev);
  document.getElementById('painel-next-cap').addEventListener('click', irCapituloNext);

  // Voltar biblioteca
  document.getElementById('btn-voltar-biblioteca').addEventListener('click', () => {
    _fimMostrado = false;
    mostrarTela('tela-biblioteca');
    Biblioteca.renderizarBiblioteca();
  });

  // Reader Settings modal
  document.getElementById('btn-rs-fechar').addEventListener('click', () => {
    document.getElementById('modal-reader-settings').style.display = 'none';
  });

  // Page layout buttons
  document.querySelectorAll('.rs-layout-btn').forEach(b => b.addEventListener('click', async () => {
    cfg.doublePage = b.dataset.val === 'dupla';
    salvarConfig(); calcularSpreads();
    spreadIdx = Math.min(spreadIdx, spreads.length - 1);
    aplicarConfig(); await renderizarSpread();
    sincronizarReaderSettings();
  }));

  // Offset
  document.getElementById('rs-offset').addEventListener('click', async () => {
    cfg.offsetSpreads = !cfg.offsetSpreads;
    salvarConfig(); calcularSpreads();
    spreadIdx = Math.min(spreadIdx, spreads.length - 1);
    aplicarConfig(); await renderizarSpread();
    sincronizarReaderSettings();
  });

  // Fit buttons
  document.querySelectorAll('.rs-fit-btn').forEach(b => b.addEventListener('click', async () => {
    cfg.fitMode = b.dataset.val;
    salvarConfig(); aplicarConfig(); await renderizarSpread();
    sincronizarReaderSettings();
  }));

  // Direção
  document.querySelectorAll('.rs-dir-btn').forEach(b => b.addEventListener('click', async () => {
    cfg.rtl = b.dataset.val === 'rtl';
    salvarConfig(); aplicarConfig(); await renderizarSpread();
    sincronizarReaderSettings();
  }));

  // Header visibility
  document.querySelectorAll('.rs-header-btn').forEach(b => b.addEventListener('click', () => {
    cfg.headerHidden = b.dataset.val === 'oculto';
    salvarConfig(); aplicarConfig();
    sincronizarReaderSettings();
  }));

  // Progress visibility
  document.querySelectorAll('.rs-progress-btn').forEach(b => b.addEventListener('click', () => {
    cfg.progressHidden = b.dataset.val === 'oculto';
    salvarConfig(); aplicarConfig();
    sincronizarReaderSettings();
  }));

  // ── TOUCH: pinch zoom + double-tap ──
  const vp = document.getElementById('leitor-viewport');

  vp.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      zoomIsPinching = true;
      zoomLastScale  = zoomScale;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      zoomOriginX   = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      zoomOriginY   = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      zoomLastPanX  = zoomPanX; zoomLastPanY = zoomPanY;
      zoomPinchDist = Math.hypot(dx, dy);
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - zoomLastTap < 280) {
        if (zoomScale > 1.05) resetZoom();
        else {
          zoomScale   = 2.5;
          zoomOriginX = e.touches[0].clientX;
          zoomOriginY = e.touches[0].clientY;
          aplicarZoom();
        }
      }
      zoomLastTap = now;
    }
  }, { passive: true });

  vp.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && zoomIsPinching) {
      e.preventDefault();
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      zoomScale  = Math.min(5, Math.max(1, zoomLastScale * (dist / zoomPinchDist)));
      aplicarZoom();
    } else if (e.touches.length === 1 && zoomScale > 1.05) {
      e.preventDefault();
      zoomPanX = zoomLastPanX + (e.touches[0].clientX - zoomOriginX);
      zoomPanY = zoomLastPanY + (e.touches[0].clientY - zoomOriginY);
      aplicarZoom();
    }
  }, { passive: false });

  vp.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      zoomIsPinching = false;
      zoomLastPanX   = zoomPanX;
      zoomLastPanY   = zoomPanY;
    }
    if (zoomScale < 1.05) resetZoom();
  }, { passive: true });

  // Mouse wheel (desktop)
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    zoomScale   = Math.min(5, Math.max(1, zoomScale - e.deltaY * 0.003));
    zoomOriginX = e.clientX; zoomOriginY = e.clientY;
    if (zoomScale <= 1.05) resetZoom(); else aplicarZoom();
  }, { passive: false });

  // Teclado
  document.addEventListener('keydown', e => {
    if (!document.getElementById('tela-leitor').classList.contains('ativa')) return;
    if (e.key === 'ArrowLeft')  cfg.rtl ? avancar() : recuar();
    if (e.key === 'ArrowRight') cfg.rtl ? recuar()  : avancar();
    if (e.key === 'Escape') {
      if (document.getElementById('modal-reader-settings').style.display !== 'none')
        document.getElementById('modal-reader-settings').style.display = 'none';
      else fecharPainel();
    }
  });
});

window.Leitor = { abrirCapitulo };
