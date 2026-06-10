// leitor.js — v5 limpo

const ConfigPadrao = {
  doublePage: true, offsetSpreads: true, fitMode: 'fitBoth',
  rtl: true, headerHidden: false, progressHidden: false,
};
let cfg = {...ConfigPadrao};
let paginas = [], imgSizes = [], spreads = [], spreadIdx = 0;
let obraIdAtual = null, capIdAtual = null, obraAtual = null;
let _fimMostrado = false;

// Zoom
let zScale=1, zLastScale=1, zOriX=0, zOriY=0;
let zPanX=0, zPanY=0, zLastPanX=0, zLastPanY=0;
let zPinching=false, zPinchDist=0, zLastTap=0;

// ── Abrir capítulo ──
async function abrirCapitulo(obraId, capId) {
  _fimMostrado = false;
  obraIdAtual = obraId; capIdAtual = capId;
  obraAtual = await DB.buscarObra(obraId);
  obraAtual.ultimoCapId = capId;
  await DB.salvarObra(obraAtual);
  const cap = obraAtual.capitulos.find(c => c.id === capId);
  paginas.forEach(u => URL.revokeObjectURL(u));
  const blobs = await DB.buscarPaginasCap(capId);
  paginas = blobs.map(b => URL.createObjectURL(b));
  imgSizes = await medirPaginas(paginas);
  const cfgSalva = JSON.parse(localStorage.getItem('mvCfg') || '{}');
  cfg = {...ConfigPadrao, ...cfgSalva};
  calcularSpreads();
  spreadIdx = 0;
  resetZoom();
  // UI
  document.getElementById('leitor-obra-nome').textContent = obraAtual.titulo;
  const capSubEl = document.getElementById('leitor-cap-sub');
  if (capSubEl) capSubEl.textContent = `Capítulo ${cap?.numero ?? ''}`;
  document.getElementById('leitor-cap-badge').textContent = `Ch. ${cap?.numero ?? ''}`;
  document.getElementById('painel-obra-nome').textContent = obraAtual.titulo;
  document.getElementById('painel-cap-nome').textContent = `Capítulo ${cap?.numero ?? ''}`;
  document.getElementById('painel-cap-val').textContent = `Capítulo ${cap?.numero ?? ''}`;
  aplicarConfig();
  await renderizarSpread();
  mostrarTela('tela-leitor');
}

function medirPaginas(urls) {
  return Promise.all(urls.map(url => new Promise(res => {
    const img = new Image();
    img.onload = () => res({w: img.naturalWidth, h: img.naturalHeight});
    img.onerror = () => res({w: 800, h: 1200});
    img.src = url;
  })));
}

function paginaEspecial(idx) {
  const s = imgSizes[idx];
  if (!s || !s.w || !s.h) return false;
  const ratio = s.w / s.h;
  const ratios = imgSizes.map(x => x.h > 0 ? x.w/x.h : 0).filter(r => r > 0).sort((a,b) => a-b);
  const med = ratios[Math.floor(ratios.length/2)] || 0.7;
  return Math.abs(ratio - med) / med > 0.4;
}

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
      if (paginaEspecial(i) || i+1 >= total || paginaEspecial(i+1)) { spreads.push([i]); i++; }
      else { spreads.push([i, i+1]); i += 2; }
    }
  } else {
    let i = 0;
    while (i < total) {
      if (paginaEspecial(i) || i+1 >= total || paginaEspecial(i+1)) { spreads.push([i]); i++; }
      else { spreads.push([i, i+1]); i += 2; }
    }
  }
}

async function renderizarSpread() {
  const container = document.getElementById('leitor-paginas');
  const spread = spreads[spreadIdx];
  if (!spread) return;
  const isDupla = spread.length === 2;
  const ordem = cfg.rtl && isDupla ? [...spread].reverse() : spread;
  // Pré-carregar antes de mostrar (elimina flash preto)
  await Promise.all(ordem.map(i => new Promise(res => {
    const img = new Image(); img.onload = res; img.onerror = res; img.src = paginas[i];
  })));
  container.innerHTML = '';
  container.classList.toggle('dupla', isDupla);
  ordem.forEach(i => {
    const img = document.createElement('img');
    img.className = 'pagina-img'; img.src = paginas[i]; img.draggable = false;
    container.appendChild(img);
  });
  atualizarUI();
  precarregarProximo();
}

function precarregarProximo() {
  const preload = document.getElementById('leitor-preload');
  preload.innerHTML = '';
  const next = spreads[spreadIdx + 1];
  if (!next) return;
  next.forEach(i => { const img = new Image(); img.src = paginas[i]; preload.appendChild(img); });
}

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
    if (spreadIdx === spreads.length - 1) mostrarFimCapitulo();
  } else {
    mostrarFimCapitulo();
  }
}
async function recuar() { if (spreadIdx > 0) await irParaSpread(spreadIdx - 1); }

function atualizarUI() {
  const spread = spreads[spreadIdx] ?? [];
  const nums = spread.map(i => i+1);
  const label = nums.length === 2 ? (cfg.rtl ? `${nums[1]}-${nums[0]}` : `${nums[0]}-${nums[1]}`) : `${nums[0]}`;
  const total = paginas.length;
  document.getElementById('leitor-pg-badge').textContent = `Pg. ${label} / ${total}`;
  document.getElementById('painel-pag-val').textContent = label;
  document.getElementById('progresso-nums').textContent = `${label} / ${total}`;
  document.getElementById('progresso-slider').value = spreadIdx;
  document.getElementById('progresso-slider').max = spreads.length - 1;
  document.getElementById('progresso-slider').classList.toggle('rtl-slider', cfg.rtl);
}

function salvarConfig() { localStorage.setItem('mvCfg', JSON.stringify(cfg)); }

function aplicarConfig() {
  const vp = document.getElementById('leitor-viewport');
  vp.classList.remove('fit-width','fit-height','fit-both');
  if (cfg.fitMode === 'fitWidth') vp.classList.add('fit-width');
  else if (cfg.fitMode === 'fitHeight') vp.classList.add('fit-height');
  else vp.classList.add('fit-both');
  document.getElementById('leitor-header').classList.toggle('oculto', cfg.headerHidden);
  document.getElementById('leitor-footer').classList.toggle('oculto', cfg.progressHidden);
  document.getElementById('leitor-header').dataset.tempOculto = '0';
  atualizarBotoesPainel();
  const fitLabel = document.getElementById('opt-fit-label');
  if (fitLabel) fitLabel.textContent = cfg.fitMode === 'fitWidth' ? 'Fit Width' : cfg.fitMode === 'fitHeight' ? 'Fit Height' : 'Fit Both';
}

function atualizarBotoesPainel() {
  const mapa = {'opt-double-page': cfg.doublePage,'opt-offset': cfg.offsetSpreads,'opt-rtl': cfg.rtl,'opt-header': cfg.headerHidden,'opt-progress': cfg.progressHidden};
  Object.entries(mapa).forEach(([id, ativo]) => document.getElementById(id)?.classList.toggle('ativo', ativo));
}

async function toggleOpcao(opt) {
  if (opt === 'fitMode') {
    const modos = ['fitBoth','fitWidth','fitHeight'];
    cfg.fitMode = modos[(modos.indexOf(cfg.fitMode)+1) % modos.length];
  } else { cfg[opt] = !cfg[opt]; }
  salvarConfig(); calcularSpreads();
  spreadIdx = Math.min(spreadIdx, spreads.length-1);
  aplicarConfig(); await renderizarSpread();
}

function abrirPainel() {
  document.getElementById('painel-lateral').classList.add('aberto');
  document.getElementById('painel-overlay').classList.add('ativo');
}
function fecharPainel() {
  document.getElementById('painel-lateral').classList.remove('aberto');
  document.getElementById('painel-overlay').classList.remove('ativo');
}

function capIdx() { return obraAtual?.capitulos.findIndex(c => c.id === capIdAtual) ?? -1; }
async function irCapituloPrev() {
  const i = capIdx(); if (i <= 0) { mostrarToast('Primeiro capítulo'); return; }
  fecharPainel(); await abrirCapitulo(obraIdAtual, obraAtual.capitulos[i-1].id);
}
async function irCapituloNext() {
  const i = capIdx(); if (i >= obraAtual.capitulos.length-1) { mostrarToast('Último capítulo'); return; }
  fecharPainel(); await abrirCapitulo(obraIdAtual, obraAtual.capitulos[i+1].id);
}

function mostrarFimCapitulo() {
  if (_fimMostrado) return;
  _fimMostrado = true;
  document.getElementById('fim-capitulo-overlay')?.remove();
  const i = capIdx();
  const temProximo = i >= 0 && i < (obraAtual?.capitulos.length ?? 0) - 1;
  const overlay = document.createElement('div');
  overlay.id = 'fim-capitulo-overlay';
  overlay.innerHTML = `<div class="fim-cap-bg"></div><div class="fim-cap-content"><div class="fim-cap-check">✓</div><div class="fim-cap-titulo">Capítulo concluído!</div><div class="fim-cap-sub">${obraAtual?.titulo ?? ''} · Cap. ${obraAtual?.capitulos[i]?.numero ?? ''}</div><div class="fim-cap-botoes"><button class="fim-cap-btn fim-cap-btn-sec" id="fim-menu">← Menu</button><button class="fim-cap-btn fim-cap-btn-pri" id="fim-prox">${temProximo ? 'Próximo →' : '+ Importar Cap.'}</button></div></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visivel'));
  overlay.querySelector('#fim-menu').addEventListener('click', () => {
    overlay.remove(); _fimMostrado = false;
    mostrarTela('tela-biblioteca'); Biblioteca.renderizarBiblioteca();
  });
  overlay.querySelector('#fim-prox').addEventListener('click', async () => {
    overlay.remove(); _fimMostrado = false;
    if (temProximo) { await abrirCapitulo(obraIdAtual, obraAtual.capitulos[i+1].id); }
    else {
      const cap = obraAtual?.capitulos[i];
      window._importPreset = {nomeObra: obraAtual?.titulo ?? '', capitulo: cap ? String(parseFloat(cap.numero)+1) : ''};
      mostrarTela('tela-biblioteca'); await Biblioteca.renderizarBiblioteca();
      setTimeout(() => document.getElementById('modal-importar').style.display='flex', 300);
    }
  });
}

// ── Reader Settings ──
function abrirReaderSettings() {
  fecharPainel();
  // Pequeno delay para o painel fechar antes do modal abrir
  setTimeout(() => {
    sincronizarReaderSettings();
    document.getElementById('modal-reader-settings').style.display = 'flex';
  }, 50);
}
function sincronizarReaderSettings() {
  document.querySelectorAll('.rs-layout-btn').forEach(b => b.classList.toggle('ativo', b.dataset.val === (cfg.doublePage ? 'dupla' : 'simples')));
  const rsOffset = document.getElementById('rs-offset');
  if (rsOffset) rsOffset.classList.toggle('ativo', cfg.offsetSpreads);
  document.querySelectorAll('.rs-fit-btn').forEach(b => b.classList.toggle('ativo', b.dataset.val === cfg.fitMode));
  document.querySelectorAll('.rs-dir-btn').forEach(b => b.classList.toggle('ativo', b.dataset.val === (cfg.rtl ? 'rtl' : 'ltr')));
  document.querySelectorAll('.rs-header-btn').forEach(b => b.classList.toggle('ativo', b.dataset.val === (cfg.headerHidden ? 'oculto' : 'visivel')));
  document.querySelectorAll('.rs-progress-btn').forEach(b => b.classList.toggle('ativo', b.dataset.val === (cfg.progressHidden ? 'oculto' : 'visivel')));
}

// ── Zoom ──
function aplicarZoom() {
  const c = document.getElementById('leitor-paginas');
  c.style.transform = `translate(${zPanX}px,${zPanY}px) scale(${zScale})`;
  c.style.transformOrigin = `${zOriX}px ${zOriY}px`;
}
function resetZoom() {
  zScale=1; zPanX=0; zPanY=0; zLastPanX=0; zLastPanY=0;
  const c = document.getElementById('leitor-paginas');
  if (c) { c.style.transform=''; c.style.transformOrigin=''; }
}

// ── Eventos ──
document.addEventListener('DOMContentLoaded', () => {
  // Zonas de toque
  document.getElementById('zona-esq').addEventListener('click', () => { if (zScale > 1.05) return; cfg.rtl ? avancar() : recuar(); });
  document.getElementById('zona-dir').addEventListener('click', () => { if (zScale > 1.05) return; cfg.rtl ? recuar() : avancar(); });

  // Toggle barras (centro)
  document.getElementById('leitor-viewport').addEventListener('click', e => {
    if (zScale > 1.05) return;
    const x = e.clientX / window.innerWidth;
    if (x <= 0.15 || x >= 0.85) return;
    const header = document.getElementById('leitor-header');
    const footer = document.getElementById('leitor-footer');
    const temp = header.dataset.tempOculto === '1';
    if (temp) {
      header.classList.toggle('oculto', cfg.headerHidden);
      footer.classList.toggle('oculto', cfg.progressHidden);
      header.dataset.tempOculto = '0';
    } else {
      header.classList.add('oculto'); footer.classList.add('oculto');
      header.dataset.tempOculto = '1';
    }
  });

  // Footer
  document.getElementById('nav-prev').addEventListener('click', recuar);
  document.getElementById('nav-next').addEventListener('click', avancar);
  document.getElementById('progresso-slider').addEventListener('input', async e => {
    await irParaSpread(parseInt(e.target.value));
    if (spreadIdx === spreads.length-1) mostrarFimCapitulo();
  });

  // Painel
  document.getElementById('btn-abrir-menu-leitor').addEventListener('click', abrirPainel);
  document.getElementById('btn-menu-leitor-pill').addEventListener('click', abrirPainel);
  document.getElementById('btn-fechar-painel').addEventListener('click', fecharPainel);
  document.getElementById('painel-overlay').addEventListener('click', fecharPainel);

  // Opções painel
  document.getElementById('opt-double-page').addEventListener('click', () => toggleOpcao('doublePage'));
  document.getElementById('opt-offset').addEventListener('click', () => toggleOpcao('offsetSpreads'));
  document.getElementById('opt-fit').addEventListener('click', () => toggleOpcao('fitMode'));
  document.getElementById('opt-rtl').addEventListener('click', () => toggleOpcao('rtl'));
  document.getElementById('opt-header').addEventListener('click', () => toggleOpcao('headerHidden'));
  document.getElementById('opt-progress').addEventListener('click', () => toggleOpcao('progressHidden'));
  document.getElementById('opt-reader-settings').addEventListener('click', abrirReaderSettings);

  // Nav painel
  document.getElementById('painel-prev-pag').addEventListener('click', () => { fecharPainel(); recuar(); });
  document.getElementById('painel-next-pag').addEventListener('click', () => { fecharPainel(); avancar(); });
  document.getElementById('painel-prev-cap').addEventListener('click', irCapituloPrev);
  document.getElementById('painel-next-cap').addEventListener('click', irCapituloNext);

  // Voltar biblioteca
  document.getElementById('btn-voltar-biblioteca').addEventListener('click', () => {
    _fimMostrado = false; mostrarTela('tela-biblioteca'); Biblioteca.renderizarBiblioteca();
  });

  // Nome obra clicável
  const btnObraNome = document.getElementById('btn-leitor-obra-nome');
  if (btnObraNome) btnObraNome.addEventListener('click', async () => {
    if (!obraIdAtual) return;
    mostrarTela('tela-biblioteca'); await Biblioteca.renderizarBiblioteca();
    setTimeout(() => Biblioteca.abrirModalObra(obraIdAtual), 100);
  });

  // Reader Settings fechamento
  document.getElementById('btn-rs-fechar').addEventListener('click', () => document.getElementById('modal-reader-settings').style.display='none');
  document.getElementById('modal-reader-settings').addEventListener('click', e => { if (e.target === document.getElementById('modal-reader-settings')) document.getElementById('modal-reader-settings').style.display='none'; });

  // RS Abas
  document.querySelectorAll('.rs-aba').forEach(aba => aba.addEventListener('click', () => {
    document.querySelectorAll('.rs-aba').forEach(a => a.classList.remove('ativo'));
    aba.classList.add('ativo');
    const v = aba.dataset.aba;
    ['layout','fit','behaviors'].forEach(id => { document.getElementById(`rs-aba-${id}`).style.display = id===v ? '' : 'none'; });
  }));

  // RS Layout
  document.querySelectorAll('.rs-layout-btn').forEach(b => b.addEventListener('click', async () => {
    cfg.doublePage = b.dataset.val === 'dupla'; salvarConfig(); calcularSpreads();
    spreadIdx = Math.min(spreadIdx, spreads.length-1); aplicarConfig(); await renderizarSpread(); sincronizarReaderSettings();
  }));
  document.getElementById('rs-offset').addEventListener('click', async () => {
    cfg.offsetSpreads = !cfg.offsetSpreads; salvarConfig(); calcularSpreads();
    spreadIdx = Math.min(spreadIdx, spreads.length-1); aplicarConfig(); await renderizarSpread(); sincronizarReaderSettings();
  });
  document.querySelectorAll('.rs-fit-btn').forEach(b => b.addEventListener('click', async () => {
    cfg.fitMode = b.dataset.val; salvarConfig(); aplicarConfig(); await renderizarSpread(); sincronizarReaderSettings();
  }));
  document.querySelectorAll('.rs-dir-btn').forEach(b => b.addEventListener('click', async () => {
    cfg.rtl = b.dataset.val === 'rtl'; salvarConfig(); aplicarConfig(); await renderizarSpread(); sincronizarReaderSettings();
  }));
  document.querySelectorAll('.rs-header-btn').forEach(b => b.addEventListener('click', () => {
    cfg.headerHidden = b.dataset.val === 'oculto'; salvarConfig(); aplicarConfig(); sincronizarReaderSettings();
  }));
  document.querySelectorAll('.rs-progress-btn').forEach(b => b.addEventListener('click', () => {
    cfg.progressHidden = b.dataset.val === 'oculto'; salvarConfig(); aplicarConfig(); sincronizarReaderSettings();
  }));

  // Touch zoom
  const vp = document.getElementById('leitor-viewport');
  vp.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      zPinching=true; zLastScale=zScale;
      zOriX=(e.touches[0].clientX+e.touches[1].clientX)/2; zOriY=(e.touches[0].clientY+e.touches[1].clientY)/2;
      zLastPanX=zPanX; zLastPanY=zPanY;
      zPinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now-zLastTap < 280) { if (zScale>1.05) resetZoom(); else { zScale=2.5; zOriX=e.touches[0].clientX; zOriY=e.touches[0].clientY; aplicarZoom(); } }
      zLastTap=now;
    }
  }, {passive:true});
  vp.addEventListener('touchmove', e => {
    if (e.touches.length===2 && zPinching) { e.preventDefault(); const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); zScale=Math.min(5,Math.max(1,zLastScale*(d/zPinchDist))); aplicarZoom(); }
    else if (e.touches.length===1 && zScale>1.05) { e.preventDefault(); zPanX=zLastPanX+(e.touches[0].clientX-zOriX); zPanY=zLastPanY+(e.touches[0].clientY-zOriY); aplicarZoom(); }
  }, {passive:false});
  vp.addEventListener('touchend', e => { if (e.touches.length<2) { zPinching=false; zLastPanX=zPanX; zLastPanY=zPanY; } if (zScale<1.05) resetZoom(); }, {passive:true});
  vp.addEventListener('wheel', e => { e.preventDefault(); zScale=Math.min(5,Math.max(1,zScale-e.deltaY*0.003)); zOriX=e.clientX; zOriY=e.clientY; if (zScale<=1.05) resetZoom(); else aplicarZoom(); }, {passive:false});

  // Teclado
  document.addEventListener('keydown', e => {
    if (!document.getElementById('tela-leitor').classList.contains('ativa')) return;
    if (e.key==='ArrowLeft') cfg.rtl ? avancar() : recuar();
    if (e.key==='ArrowRight') cfg.rtl ? recuar() : avancar();
    if (e.key==='Escape') { document.getElementById('modal-reader-settings').style.display='none'; fecharPainel(); }
  });
});

window.Leitor = {abrirCapitulo};
