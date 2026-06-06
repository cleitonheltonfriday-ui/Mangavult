// ═══════════════════════════════════════════════
//  leitor.js — Leitor estilo MangaDex (v2 — fixes aplicados)
// ═══════════════════════════════════════════════

const ConfigPadrao = {
  doublePage: true,
  offsetSpreads: true,
  fitMode: 'fitBoth',
  rtl: true,
  headerHidden: false,
  progressHidden: false,
};

let cfg = { ...ConfigPadrao };
let paginas = [];       // blob URLs
let imgSizes = [];      // {w,h} de cada página (para detectar páginas estreitas/créditos)
let spreads = [];
let spreadIdx = 0;
let obraIdAtual = null;
let capIdAtual = null;
let obraAtual = null;
let preloadUrls = [];   // URLs pré-carregadas do próximo spread

// ───── Abrir capítulo ─────
async function abrirCapitulo(obraId, capId) {
  obraIdAtual = obraId;
  capIdAtual = capId;
  obraAtual = await DB.buscarObra(obraId);
  obraAtual.ultimoCapId = capId;
  await DB.salvarObra(obraAtual);

  const cap = obraAtual.capitulos.find(c => c.id === capId);

  const blobs = await DB.buscarPaginasCap(capId);
  paginas.forEach(u => URL.revokeObjectURL(u));
  paginas = blobs.map(b => URL.createObjectURL(b));

  // Medir dimensões de cada página para detectar imagens especiais (créditos, etc.)
  imgSizes = await medirPaginas(paginas);

  const cfgSalva = JSON.parse(localStorage.getItem('mvCfg') || '{}');
  cfg = { ...ConfigPadrao, ...cfgSalva };

  calcularSpreads();
  spreadIdx = 0;

  document.getElementById('leitor-obra-nome').textContent = obraAtual.titulo;
  document.getElementById('leitor-cap-badge').textContent = `Ch. ${cap?.numero ?? ''}`;
  document.getElementById('painel-obra-nome').textContent = obraAtual.titulo;
  document.getElementById('painel-cap-nome').textContent = `Capítulo ${cap?.numero ?? ''}`;
  document.getElementById('painel-cap-val').textContent = `Capítulo ${cap?.numero ?? ''}`;

  aplicarConfig();
  // FIX 4: renderizar sem flash — montar imagens antes de exibir
  await renderizarSpreadSemFlash();
  mostrarTela('tela-leitor');
}

// ───── Medir páginas (para FIX 5) ─────
function medirPaginas(urls) {
  return Promise.all(urls.map(url => new Promise(res => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => res({ w: 800, h: 1200 });
    img.src = url;
  })));
}

// ───── FIX 5: página "especial" não entra em dupla ─────
// Uma página é considerada especial (créditos, wide, etc.) se sua proporção
// for muito diferente da mediana das demais páginas.
function paginaEspecial(idx) {
  if (!imgSizes[idx]) return false;
  const { w, h } = imgSizes[idx];
  if (w === 0 || h === 0) return false;
  const ratio = w / h;

  // Calcular mediana da proporção das páginas
  const ratios = imgSizes.map(s => s.h > 0 ? s.w / s.h : 0).filter(r => r > 0).sort((a,b)=>a-b);
  const mediana = ratios[Math.floor(ratios.length / 2)] || 0.7;

  // Se a página for muito mais larga que a mediana (ex: créditos landscape)
  // ou muito mais estreita (ex: página portrait isolada num conjunto wide)
  // considera especial. Threshold: 40% de desvio da mediana.
  const desvio = Math.abs(ratio - mediana) / mediana;
  return desvio > 0.4;
}

// ───── Calcular spreads ─────
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
      // FIX 5: se a página atual ou a seguinte é especial, mostra sozinha
      if (paginaEspecial(i) || i + 1 >= total || paginaEspecial(i + 1)) {
        spreads.push([i]);
        i++;
      } else {
        spreads.push([i, i + 1]);
        i += 2;
      }
    }
  } else {
    let i = 0;
    while (i < total) {
      if (paginaEspecial(i) || i + 1 >= total || paginaEspecial(i + 1)) {
        spreads.push([i]);
        i++;
      } else {
        spreads.push([i, i + 1]);
        i += 2;
      }
    }
  }
}

// ───── FIX 4: renderizar sem flash ─────
async function renderizarSpreadSemFlash() {
  const container = document.getElementById('leitor-paginas');
  const spread = spreads[spreadIdx];
  if (!spread) return;

  const isDupla = spread.length === 2;
  const ordem = cfg.rtl && isDupla ? [...spread].reverse() : spread;

  // Pré-carregar as imagens antes de mostrar
  await Promise.all(ordem.map(idx => new Promise(res => {
    const img = new Image();
    img.onload = res; img.onerror = res;
    img.src = paginas[idx];
  })));

  container.innerHTML = '';
  container.classList.toggle('dupla', isDupla);
  ordem.forEach(idx => {
    const img = document.createElement('img');
    img.className = 'pagina-img';
    img.src = paginas[idx];
    img.draggable = false;
    container.appendChild(img);
  });

  atualizarUI();
  precarregarProximo();
}

function renderizarSpread() {
  renderizarSpreadSemFlash();
}

// ───── Pré-carregar próximo spread (FIX 4) ─────
function precarregarProximo() {
  const preload = document.getElementById('leitor-preload');
  preload.innerHTML = '';
  const nextIdx = spreadIdx + 1;
  if (nextIdx >= spreads.length) return;
  const spread = spreads[nextIdx];
  spread.forEach(i => {
    const img = document.createElement('img');
    img.src = paginas[i];
    preload.appendChild(img);
  });
}

// ───── Navegação ─────
function irParaSpread(idx) {
  window._resetZoom && window._resetZoom();
  if (idx < 0 || idx >= spreads.length) return;
  spreadIdx = idx;
  document.getElementById('progresso-slider').value = idx;
  renderizarSpreadSemFlash();
}

function avancar() { if (spreadIdx < spreads.length - 1) { irParaSpread(spreadIdx + 1); if (spreadIdx === spreads.length - 1) verificarFimCapitulo(); } else { verificarFimCapitulo(); } }
function recuar()  { if (spreadIdx > 0) irParaSpread(spreadIdx - 1); }

// ───── UI ─────
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

  // FIX 3: direção do slider acompanha RTL
  const slider = document.getElementById('progresso-slider');
  slider.classList.toggle('rtl-slider', cfg.rtl);
}

// ───── Config ─────
function salvarConfig() { localStorage.setItem('mvCfg', JSON.stringify(cfg)); }

function aplicarConfig() {
  const viewport = document.getElementById('leitor-viewport');
  viewport.classList.remove('fit-width', 'fit-height', 'fit-both');
  viewport.classList.add(
    cfg.fitMode === 'fitWidth' ? 'fit-width' :
    cfg.fitMode === 'fitHeight' ? 'fit-height' : 'fit-both'
  );

  // FIX 2: header/footer obedecem configuração salva
  document.getElementById('leitor-header').classList.toggle('oculto', cfg.headerHidden);
  document.getElementById('leitor-footer').classList.toggle('oculto', cfg.progressHidden);

  atualizarBotoesPainel();
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
    cfg.fitMode = modos[(modos.indexOf(cfg.fitMode) + 1) % modos.length];
  } else {
    cfg[opt] = !cfg[opt];
  }
  salvarConfig();
  calcularSpreads();
  spreadIdx = Math.min(spreadIdx, spreads.length - 1);
  aplicarConfig();
  renderizarSpreadSemFlash();
}

// ───── Painel ─────
function abrirPainel() {
  document.getElementById('painel-lateral').classList.add('aberto');
  document.getElementById('painel-overlay').classList.add('ativo');
}
function fecharPainel() {
  document.getElementById('painel-lateral').classList.remove('aberto');
  document.getElementById('painel-overlay').classList.remove('ativo');
}

// ───── Nav capítulos ─────
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

// ───── Eventos ─────
document.addEventListener('DOMContentLoaded', () => {

  // Zonas de toque
  document.getElementById('zona-esq').addEventListener('click', () => cfg.rtl ? avancar() : recuar());
  document.getElementById('zona-dir').addEventListener('click', () => cfg.rtl ? recuar() : avancar());

  // Setas footer
  document.getElementById('nav-prev').addEventListener('click', recuar);
  document.getElementById('nav-next').addEventListener('click', avancar);

  // Slider
  document.getElementById('progresso-slider').addEventListener('input', e => {
    irParaSpread(parseInt(e.target.value));
    if (spreadIdx === spreads.length - 1) verificarFimCapitulo();
  });

  // Painel
  document.getElementById('btn-abrir-menu-leitor').addEventListener('click', abrirPainel);
  document.getElementById('btn-menu-leitor-pill').addEventListener('click', abrirPainel);
  document.getElementById('btn-fechar-painel').addEventListener('click', fecharPainel);
  document.getElementById('painel-overlay').addEventListener('click', fecharPainel);

  // Opções
  document.getElementById('opt-double-page').addEventListener('click', () => toggleOpcao('doublePage'));
  document.getElementById('opt-offset').addEventListener('click', () => toggleOpcao('offsetSpreads'));
  document.getElementById('opt-fit').addEventListener('click', () => toggleOpcao('fitMode'));
  document.getElementById('opt-rtl').addEventListener('click', () => toggleOpcao('rtl'));
  document.getElementById('opt-header').addEventListener('click', () => toggleOpcao('headerHidden'));
  document.getElementById('opt-progress').addEventListener('click', () => toggleOpcao('progressHidden'));
  document.getElementById('opt-reader-settings').addEventListener('click', () => {
    fecharPainel();
    mostrarToast('Configurações salvas automaticamente');
  });

  // Nav painel
  document.getElementById('painel-prev-pag').addEventListener('click', () => { fecharPainel(); recuar(); });
  document.getElementById('painel-next-pag').addEventListener('click', () => { fecharPainel(); avancar(); });
  document.getElementById('painel-prev-cap').addEventListener('click', irCapituloPrev);
  document.getElementById('painel-next-cap').addEventListener('click', irCapituloNext);

  // Voltar
  document.getElementById('btn-voltar-biblioteca').addEventListener('click', () => {
    mostrarTela('tela-biblioteca');
    Biblioteca.renderizarBiblioteca();
  });

  // FIX 2: toque central mostra/oculta barras temporariamente (só se não estiverem em modo permanente oculto)
  document.getElementById('leitor-viewport').addEventListener('click', e => {
    const x = e.clientX / window.innerWidth;
    if (x > 0.15 && x < 0.85) {
      const header = document.getElementById('leitor-header');
      const footer = document.getElementById('leitor-footer');
      // Se ambas as opções de ocultação permanente estão ativas, não fazer nada
      if (cfg.headerHidden && cfg.progressHidden) return;
      const estaOcultoTemp = header.dataset.tempOculto === '1';
      if (estaOcultoTemp) {
        // Mostrar de volta (mas respeitando config)
        header.classList.toggle('oculto', cfg.headerHidden);
        footer.classList.toggle('oculto', cfg.progressHidden);
        header.dataset.tempOculto = '0';
      } else {
        // Ocultar temporariamente
        if (!cfg.headerHidden)  header.classList.add('oculto');
        if (!cfg.progressHidden) footer.classList.add('oculto');
        header.dataset.tempOculto = '1';
      }
    }
  });

  // Teclado
  document.addEventListener('keydown', e => {
    if (!document.getElementById('tela-leitor').classList.contains('ativa')) return;
    if (e.key === 'ArrowLeft')  cfg.rtl ? avancar() : recuar();
    if (e.key === 'ArrowRight') cfg.rtl ? recuar() : avancar();
  });
});

window.Leitor = { abrirCapitulo };

// ────────────────────────────────────────────────
//  ZOOM (pinch-to-zoom + double-tap)
// ────────────────────────────────────────────────
(function() {
  let scale = 1, lastScale = 1;
  let originX = 0, originY = 0;
  let panX = 0, panY = 0;
  let lastPanX = 0, lastPanY = 0;
  let isPinching = false;
  let lastTap = 0;

  function aplicarTransform() {
    const c = document.getElementById('leitor-paginas');
    c.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
    c.style.transformOrigin = `${originX}px ${originY}px`;
  }

  function resetZoom() {
    scale = 1; panX = 0; panY = 0;
    const c = document.getElementById('leitor-paginas');
    c.style.transform = '';
    c.style.transformOrigin = '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const vp = document.getElementById('leitor-viewport');

    // Pinch zoom
    vp.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        isPinching = true;
        lastScale = scale;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        originX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        originY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        lastPanX = panX; lastPanY = panY;
        window._pinchDist = Math.hypot(dx, dy);
      }
      // double-tap
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTap < 300) {
          if (scale !== 1) resetZoom();
          else { scale = 2.5; originX = e.touches[0].clientX; originY = e.touches[0].clientY; aplicarTransform(); }
        }
        lastTap = now;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        scale = Math.min(5, Math.max(1, lastScale * (dist / window._pinchDist)));
        aplicarTransform();
      } else if (e.touches.length === 1 && scale > 1) {
        // pan quando com zoom
        panX = lastPanX + (e.touches[0].clientX - originX) * 0.5;
        panY = lastPanY + (e.touches[0].clientY - originY) * 0.5;
        aplicarTransform();
      }
    }, { passive: false });

    vp.addEventListener('touchend', e => {
      if (e.touches.length < 2) { isPinching = false; lastPanX = panX; lastPanY = panY; }
      if (scale < 1.05) resetZoom();
    }, { passive: true });

    // Mouse wheel zoom (desktop)
    vp.addEventListener('wheel', e => {
      e.preventDefault();
      scale = Math.min(5, Math.max(1, scale - e.deltaY * 0.002));
      originX = e.clientX; originY = e.clientY;
      if (scale <= 1.05) resetZoom(); else aplicarTransform();
    }, { passive: false });
  });

  // Resetar zoom ao trocar spread
  const origIrParaSpread = window.irParaSpread;
  window._resetZoom = resetZoom;
})();

// ────────────────────────────────────────────────
//  TELA DE FIM DE CAPÍTULO
// ────────────────────────────────────────────────
function verificarFimCapitulo() {
  if (spreadIdx === spreads.length - 1) {
    setTimeout(mostrarFimCapitulo, 400);
  }
}

function mostrarFimCapitulo() {
  const idx = obraAtual?.capitulos.findIndex(c => c.id === capIdAtual) ?? -1;
  const temProximo = idx >= 0 && idx < (obraAtual?.capitulos.length ?? 0) - 1;

  const overlay = document.createElement('div');
  overlay.id = 'fim-capitulo-overlay';
  overlay.innerHTML = `
    <div class="fim-cap-bg"></div>
    <div class="fim-cap-content">
      <div class="fim-cap-check">✓</div>
      <div class="fim-cap-titulo">Capítulo concluído!</div>
      <div class="fim-cap-sub">${obraAtual?.titulo ?? ''} · Cap. ${obraAtual?.capitulos[idx]?.numero ?? ''}</div>
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
    overlay.remove();
    mostrarTela('tela-biblioteca');
    Biblioteca.renderizarBiblioteca();
  });
  overlay.querySelector('#fim-proximo').addEventListener('click', () => {
    overlay.remove();
    if (temProximo) {
      irCapituloNext();
    } else {
      const cap = obraAtual?.capitulos[idx];
      const prox = cap ? String(parseFloat(cap.numero) + 1) : '';
      window._importPreset = { nomeObra: obraAtual?.titulo ?? '', capitulo: prox };
      mostrarTela('tela-biblioteca');
      Biblioteca.renderizarBiblioteca();
      setTimeout(() => document.getElementById('modal-importar').style.display = 'flex', 300);
    }
  });
}
