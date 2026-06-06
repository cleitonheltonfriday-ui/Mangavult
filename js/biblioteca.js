// ═══════════════════════════════════════════════
//  biblioteca.js — v3 (bugs corrigidos)
// ═══════════════════════════════════════════════

let obraAtualModal = null;

// ────── Renderizar biblioteca ──────
async function renderizarBiblioteca(filtro = '') {
  const lista  = document.getElementById('biblioteca-lista');
  const vazia  = document.getElementById('biblioteca-vazia');
  let   obras  = await DB.buscarTodasObras();

  [...lista.querySelectorAll('.obra-card')].forEach(c => c.remove());

  if (!obras.length) { vazia.style.display = 'flex'; return; }

  if (filtro) obras = obras.filter(o => o.titulo.toLowerCase().includes(filtro.toLowerCase()));
  obras.sort((a,b) => a.titulo.localeCompare(b.titulo));
  vazia.style.display = obras.length ? 'none' : 'flex';

  obras.forEach(obra => {
    const card = document.createElement('div');
    card.className = 'obra-card';

    if (obra.capaUrl) {
      const img = document.createElement('img');
      img.className = 'obra-capa'; img.src = obra.capaUrl; img.alt = obra.titulo;
      card.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'obra-capa-placeholder'; ph.textContent = '📖';
      card.appendChild(ph);
    }

    const ultimo = obra.capitulos[obra.capitulos.length - 1];
    const info = document.createElement('div');
    info.className = 'obra-info';
    info.innerHTML = `
      <div class="obra-titulo">${obra.titulo}</div>
      <div class="obra-meta">${obra.capitulos.length} capítulo${obra.capitulos.length !== 1 ? 's' : ''}</div>
      <div class="obra-ultimo">Cap. ${ultimo?.numero ?? '—'}</div>`;
    card.appendChild(info);
    card.addEventListener('click', () => abrirModalObra(obra.id));
    lista.appendChild(card);
  });
}

// ────── Modal de obra ──────
async function abrirModalObra(obraId) {
  const obra = await DB.buscarObra(obraId);
  if (!obra) return;
  obraAtualModal = obra;

  document.getElementById('obra-titulo-modal').textContent = obra.titulo;
  document.getElementById('obra-sub-modal').textContent =
    `${obra.capitulos.length} capítulo${obra.capitulos.length !== 1 ? 's' : ''}`;

  const descEl = document.getElementById('obra-descricao-modal');
  descEl.textContent = obra.descricao || '';
  descEl.style.display = obra.descricao ? '' : 'none';

  // Capa clicável
  const wrap = document.getElementById('obra-capa-wrap');
  wrap.innerHTML = '';
  if (obra.capaUrl) {
    const img = document.createElement('img');
    img.className = 'obra-capa-modal'; img.src = obra.capaUrl;
    img.title = 'Clique para trocar a capa';
    img.addEventListener('click', () => document.getElementById('input-trocar-capa').click());
    wrap.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'obra-capa-placeholder-modal'; ph.textContent = '📖';
    ph.title = 'Clique para adicionar capa';
    ph.addEventListener('click', () => document.getElementById('input-trocar-capa').click());
    wrap.appendChild(ph);
  }

  // Lista de capítulos — BUG CORRIGIDO: clipe não aciona lixeira
  const listaEl = document.getElementById('capitulos-lista-modal');
  listaEl.innerHTML = '';
  const caps = [...obra.capitulos].sort((a,b) => parseFloat(b.numero) - parseFloat(a.numero));

  caps.forEach(cap => {
    const item = document.createElement('div');
    item.className = 'cap-item';

    const nome = document.createElement('span');
    nome.className = 'cap-item-nome';
    nome.textContent = `Cap. ${cap.numero}`;

    const acoes = document.createElement('div');
    acoes.style.cssText = 'display:flex;gap:6px;align-items:center';

    // Botão migrar (clipe)
    const btnShare = document.createElement('button');
    btnShare.className = 'cap-item-del';
    btnShare.title = 'Migrar capítulo';
    btnShare.textContent = '🔗';
    btnShare.style.color = '#7ecfff';
    btnShare.addEventListener('click', e => {
      e.stopPropagation();
      window.migrarCapitulo && window.migrarCapitulo(obra.id, cap.id);
    });

    // Botão excluir (lixeira)
    const btnDel = document.createElement('button');
    btnDel.className = 'cap-item-del';
    btnDel.title = 'Excluir';
    btnDel.textContent = '🗑';
    btnDel.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(`Excluir capítulo ${cap.numero}?`)) return;
      await deletarCapitulo(obra, cap.id);
    });

    acoes.appendChild(btnShare);
    acoes.appendChild(btnDel);
    item.appendChild(nome);
    item.appendChild(acoes);

    // Clicar no item (fora dos botões) abre o capítulo
    item.addEventListener('click', () => {
      fecharModalObra();
      window.Leitor.abrirCapitulo(obra.id, cap.id);
    });
    listaEl.appendChild(item);
  });

  document.getElementById('modal-obra').style.display = 'flex';
}

async function deletarCapitulo(obra, capId) {
  await DB.deletarPaginasCap(capId);
  obra.capitulos = obra.capitulos.filter(c => c.id !== capId);
  if (!obra.capitulos.length) obra.capaUrl = null;
  await DB.salvarObra(obra);
  fecharModalObra();
  await renderizarBiblioteca();
  mostrarToast('Capítulo excluído');
}

function fecharModalObra() {
  document.getElementById('modal-obra').style.display = 'none';
  obraAtualModal = null;
}

// ────── Listeners dos botões do modal obra ──────
document.getElementById('btn-fechar-obra').addEventListener('click', fecharModalObra);
document.getElementById('modal-obra').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-obra')) fecharModalObra();
});

document.getElementById('btn-continuar-leitura').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  const obra  = obraAtualModal;
  const capId = obra.ultimoCapId ?? obra.capitulos[obra.capitulos.length - 1]?.id;
  if (!capId) return;
  fecharModalObra();
  window.Leitor.abrirCapitulo(obra.id, capId);
});

document.getElementById('btn-add-proximo').addEventListener('click', () => {
  if (!obraAtualModal) return;
  const obra     = obraAtualModal;
  const ultimoNum = Math.max(...obra.capitulos.map(c => parseFloat(c.numero) || 0));
  fecharModalObra();
  window._importPreset = { nomeObra: obra.titulo, capitulo: isFinite(ultimoNum) ? String(ultimoNum + 1) : '' };
  document.getElementById('modal-importar').style.display = 'flex';
});

document.getElementById('btn-deletar-obra').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  if (!confirm(`Excluir "${obraAtualModal.titulo}" e todos os capítulos?`)) return;
  const obra = obraAtualModal;
  fecharModalObra();
  await DB.deletarObra(obra.id, obra);
  await renderizarBiblioteca();
  mostrarToast('Obra excluída');
});

// Trocar capa via galeria
document.getElementById('input-trocar-capa').addEventListener('change', async e => {
  if (!e.target.files[0] || !obraAtualModal) return;
  const obraId = obraAtualModal.id;
  const file = e.target.files[0];
  e.target.value = '';
  const novaCapaUrl = await gerarCapaDeArquivo(file);
  const obra = await DB.buscarObra(obraId);
  if (!obra) return;
  obra.capaUrl = novaCapaUrl;
  await DB.salvarObra(obra);
  await renderizarBiblioteca();
  await abrirModalObra(obraId);
  mostrarToast('Capa atualizada!');
});

document.getElementById('btn-trocar-capa').addEventListener('click', () => {
  document.getElementById('input-trocar-capa').click();
});

// Editar descrição — BUG CORRIGIDO: fechar modal obra antes de abrir descrição
document.getElementById('btn-editar-descricao').addEventListener('click', () => {
  if (!obraAtualModal) return;
  const desc = obraAtualModal.descricao || '';
  const obraId = obraAtualModal.id;
  // Salvar referência antes de fechar
  window._editandoDescricaoObraId = obraId;
  document.getElementById('input-descricao').value = desc;
  // Fechar modal obra para a de descrição aparecer sem sobreposição
  document.getElementById('modal-obra').style.display = 'none';
  document.getElementById('modal-descricao').style.display = 'flex';
});

document.getElementById('btn-descricao-cancelar').addEventListener('click', async () => {
  document.getElementById('modal-descricao').style.display = 'none';
  // Reabrir modal obra
  if (window._editandoDescricaoObraId) {
    await abrirModalObra(window._editandoDescricaoObraId);
    window._editandoDescricaoObraId = null;
  }
});

document.getElementById('btn-descricao-salvar').addEventListener('click', async () => {
  const obraId = window._editandoDescricaoObraId;
  if (!obraId) return;
  const obra = await DB.buscarObra(obraId);
  if (!obra) return;
  obra.descricao = document.getElementById('input-descricao').value.trim();
  await DB.salvarObra(obra);
  document.getElementById('modal-descricao').style.display = 'none';
  window._editandoDescricaoObraId = null;
  await abrirModalObra(obraId);
  mostrarToast('Descrição salva!');
});

// Derivar descrição da web (Jikan) — abre sem fechar modal obra
document.getElementById('btn-derivar-descricao-web').addEventListener('click', async () => {
  const obraId = window._editandoDescricaoObraId;
  if (!obraId) return;
  const obra = await DB.buscarObra(obraId);
  if (!obra) return;
  const btn = document.getElementById('btn-derivar-descricao-web');
  btn.textContent = '⏳ Buscando…';
  btn.disabled = true;
  try {
    const desc = await buscarDescricaoWeb(obra.titulo);
    if (desc) {
      document.getElementById('input-descricao').value = desc;
      mostrarToast('Descrição encontrada!');
    } else {
      mostrarToast('Nenhuma descrição encontrada na web');
    }
  } catch(e) {
    mostrarToast('Erro ao buscar: ' + e.message);
  }
  btn.textContent = '🌐 Derivar descrição da web';
  btn.disabled = false;
});

// Derivar obra da web a partir do modal obra
document.getElementById('btn-derivar-obra-existente').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  const obraId = obraAtualModal.id;
  const nome   = obraAtualModal.titulo;
  fecharModalObra();
  document.getElementById('input-derivar-nome').value = nome;
  document.getElementById('derivar-progresso').style.display = 'none';
  document.getElementById('btn-derivar-confirmar').disabled = false;
  // Guardar obraId para reaplicar após derivar
  window._derivarParaObraId = obraId;
  document.getElementById('modal-derivar').style.display = 'flex';
});

// ────── Helpers ──────
async function gerarCapaDeArquivo(file) {
  return new Promise(res => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 160; c.height = 220;
      const ctx = c.getContext('2d');
      const r = Math.max(160/img.width, 220/img.height);
      ctx.drawImage(img,(160-img.width*r)/2,(220-img.height*r)/2,img.width*r,img.height*r);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

async function buscarDescricaoWeb(nome) {
  const r = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(nome)}&limit=1`);
  if (!r.ok) throw new Error('API indisponível');
  const data = await r.json();
  return data?.data?.[0]?.synopsis || null;
}

async function derivarObraWeb(nome) {
  const r = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(nome)}&limit=1`);
  if (!r.ok) throw new Error('API indisponível');
  const data = await r.json();
  const item = data?.data?.[0];
  if (!item) return null;
  return {
    descricao: item.synopsis || '',
    capaUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
  };
}

window.Biblioteca = { renderizarBiblioteca, abrirModalObra, derivarObraWeb, buscarDescricaoWeb };
