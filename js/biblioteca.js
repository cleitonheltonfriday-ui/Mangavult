// ═══════════════════════════════════════════════
//  biblioteca.js — v2
// ═══════════════════════════════════════════════

let obraAtualModal = null;

async function renderizarBiblioteca(filtro = '') {
  const lista = document.getElementById('biblioteca-lista');
  const vazia = document.getElementById('biblioteca-vazia');
  let obras = await DB.buscarTodasObras();

  [...lista.querySelectorAll('.obra-card')].forEach(c => c.remove());

  if (!obras.length) { vazia.style.display = 'flex'; return; }

  if (filtro) {
    obras = obras.filter(o => o.titulo.toLowerCase().includes(filtro.toLowerCase()));
  }

  obras.sort((a, b) => a.titulo.localeCompare(b.titulo));
  vazia.style.display = obras.length ? 'none' : 'flex';

  obras.forEach(obra => {
    const card = document.createElement('div');
    card.className = 'obra-card';
    card.dataset.obraId = obra.id;

    if (obra.capaUrl) {
      const img = document.createElement('img');
      img.className = 'obra-capa';
      img.src = obra.capaUrl;
      img.alt = obra.titulo;
      card.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'obra-capa-placeholder';
      ph.textContent = '📖';
      card.appendChild(ph);
    }

    const ultimoCap = obra.capitulos[obra.capitulos.length - 1];
    const info = document.createElement('div');
    info.className = 'obra-info';
    info.innerHTML = `
      <div class="obra-titulo">${obra.titulo}</div>
      <div class="obra-meta">${obra.capitulos.length} capítulo${obra.capitulos.length !== 1 ? 's' : ''}</div>
      <div class="obra-ultimo">Cap. ${ultimoCap?.numero ?? '—'}</div>
    `;
    card.appendChild(info);
    card.addEventListener('click', () => abrirModalObra(obra.id));
    lista.appendChild(card);
  });
}

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

  // Capa (FIX 7: clicável para trocar)
  const capaWrap = document.getElementById('obra-capa-wrap');
  capaWrap.innerHTML = '';
  if (obra.capaUrl) {
    const img = document.createElement('img');
    img.className = 'obra-capa-modal';
    img.src = obra.capaUrl;
    img.title = 'Clique para trocar a capa';
    img.addEventListener('click', () => document.getElementById('input-trocar-capa').click());
    capaWrap.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'obra-capa-placeholder-modal';
    ph.textContent = '📖';
    ph.title = 'Clique para adicionar capa';
    ph.addEventListener('click', () => document.getElementById('input-trocar-capa').click());
    capaWrap.appendChild(ph);
  }

  // Lista capítulos
  const listaEl = document.getElementById('capitulos-lista-modal');
  listaEl.innerHTML = '';
  const caps = [...obra.capitulos].sort((a, b) => parseFloat(b.numero) - parseFloat(a.numero));
  caps.forEach(cap => {
    const item = document.createElement('div');
    item.className = 'cap-item';
    item.innerHTML = `
      <span class="cap-item-nome">Cap. ${cap.numero}</span>
      <div style="display:flex;gap:4px;align-items:center">
        <button class="cap-item-del cap-item-share" title="Migrar capítulo" style="color:#7ecfff">🔗</button>
        <button class="cap-item-del" title="Excluir">🗑</button>
      </div>
    `;
    item.querySelector('.cap-item-share').addEventListener('click', e => {
      e.stopPropagation();
      window.migrarCapitulo && window.migrarCapitulo(obra.id, cap.id);
    });
    item.querySelector('.cap-item-del').addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(`Excluir capítulo ${cap.numero}?`)) return;
      await deletarCapitulo(obra, cap.id);
    });
    item.addEventListener('click', () => { fecharModalObra(); window.Leitor.abrirCapitulo(obra.id, cap.id); });
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

// ───── Botões modal obra ─────
document.getElementById('btn-fechar-obra').addEventListener('click', fecharModalObra);
document.getElementById('modal-obra').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-obra')) fecharModalObra();
});

document.getElementById('btn-continuar-leitura').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  const obra = obraAtualModal;
  const capId = obra.ultimoCapId ?? obra.capitulos[obra.capitulos.length - 1]?.id;
  if (!capId) return;
  fecharModalObra();
  window.Leitor.abrirCapitulo(obra.id, capId);
});

document.getElementById('btn-add-proximo').addEventListener('click', () => {
  if (!obraAtualModal) return;
  const obra = obraAtualModal;
  fecharModalObra();
  const ultimoNum = Math.max(...obra.capitulos.map(c => parseFloat(c.numero) || 0));
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

// FIX 7: Trocar capa via galeria
document.getElementById('input-trocar-capa').addEventListener('change', async e => {
  if (!e.target.files[0] || !obraAtualModal) return;
  const file = e.target.files[0];
  e.target.value = '';
  const novaCapaUrl = await gerarCapaDeArquivo(file);
  obraAtualModal.capaUrl = novaCapaUrl;
  await DB.salvarObra(obraAtualModal);
  await renderizarBiblioteca();
  await abrirModalObra(obraAtualModal.id);
  mostrarToast('Capa atualizada!');
});

document.getElementById('btn-trocar-capa').addEventListener('click', () => {
  document.getElementById('input-trocar-capa').click();
});

// Editar descrição
document.getElementById('btn-editar-descricao').addEventListener('click', () => {
  if (!obraAtualModal) return;
  document.getElementById('input-descricao').value = obraAtualModal.descricao || '';
  document.getElementById('modal-descricao').style.display = 'flex';
});
document.getElementById('btn-descricao-cancelar').addEventListener('click', () => {
  document.getElementById('modal-descricao').style.display = 'none';
});
document.getElementById('btn-descricao-salvar').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  obraAtualModal.descricao = document.getElementById('input-descricao').value.trim();
  await DB.salvarObra(obraAtualModal);
  document.getElementById('modal-descricao').style.display = 'none';
  await abrirModalObra(obraAtualModal.id);
  mostrarToast('Descrição salva!');
});

// Derivar descrição da web (via Jikan/MAL)
document.getElementById('btn-derivar-descricao-web').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  const nome = obraAtualModal.titulo;
  document.getElementById('btn-derivar-descricao-web').textContent = '⏳ Buscando…';
  try {
    const desc = await buscarDescricaoWeb(nome);
    if (desc) {
      document.getElementById('input-descricao').value = desc;
      mostrarToast('Descrição encontrada!');
    } else {
      mostrarToast('Nenhuma descrição encontrada');
    }
  } catch {
    mostrarToast('Erro ao buscar descrição');
  }
  document.getElementById('btn-derivar-descricao-web').textContent = '🌐 Derivar descrição da web';
});

// Derivar obra existente da web
document.getElementById('btn-derivar-obra-existente').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  fecharModalObra();
  document.getElementById('input-derivar-nome').value = obraAtualModal.titulo;
  document.getElementById('modal-derivar').style.display = 'flex';
});

async function gerarCapaDeArquivo(file) {
  return new Promise(res => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const W = 160, H = 220;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      const ratio = Math.max(W / img.width, H / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      ctx.drawImage(img, (W-w)/2, (H-h)/2, w, h);
      URL.revokeObjectURL(url);
      res(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

async function buscarDescricaoWeb(nome) {
  const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(nome)}&limit=1`;
  const r = await fetch(url);
  const data = await r.json();
  return data?.data?.[0]?.synopsis || null;
}

async function derivarObraWeb(nome) {
  const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(nome)}&limit=1`;
  const r = await fetch(url);
  const data = await r.json();
  const item = data?.data?.[0];
  if (!item) return null;
  return {
    descricao: item.synopsis || '',
    capaUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
  };
}

window.Biblioteca = { renderizarBiblioteca, abrirModalObra, derivarObraWeb, buscarDescricaoWeb };
