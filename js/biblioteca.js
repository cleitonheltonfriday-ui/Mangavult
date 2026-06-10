// biblioteca.js — v5

let obraAtualModal = null;

async function renderizarBiblioteca(filtro='') {
  const lista = document.getElementById('biblioteca-lista');
  const vazia = document.getElementById('biblioteca-vazia');
  let obras = await DB.buscarTodasObras();
  [...lista.querySelectorAll('.obra-card')].forEach(c => c.remove());
  if (!obras.length) { vazia.style.display='flex'; return; }
  if (filtro) obras = obras.filter(o => o.titulo.toLowerCase().includes(filtro.toLowerCase()));
  obras.sort((a,b) => a.titulo.localeCompare(b.titulo));
  vazia.style.display = obras.length ? 'none' : 'flex';
  obras.forEach(obra => {
    const card = document.createElement('div');
    card.className = 'obra-card';
    if (obra.capaUrl) {
      const img = document.createElement('img'); img.className='obra-capa'; img.src=obra.capaUrl; img.alt=obra.titulo; card.appendChild(img);
    } else {
      const ph = document.createElement('div'); ph.className='obra-capa-placeholder'; ph.textContent='📖'; card.appendChild(ph);
    }
    const ultimo = obra.capitulos[obra.capitulos.length-1];
    const info = document.createElement('div'); info.className='obra-info';
    info.innerHTML=`<div class="obra-titulo">${obra.titulo}</div><div class="obra-meta">${obra.capitulos.length} capítulo${obra.capitulos.length!==1?'s':''}</div><div class="obra-ultimo">Cap. ${ultimo?.numero??'—'}</div>`;
    card.appendChild(info);
    card.addEventListener('click', () => abrirModalObra(obra.id));
    lista.appendChild(card);
  });
}

async function abrirModalObra(obraId) {
  const obra = await DB.buscarObra(obraId);
  if (!obra) return;
  obraAtualModal = obra;
  // Banner
  const bannerEl = document.getElementById('obra-modal-banner');
  const bannerImg = document.getElementById('obra-banner-img');
  if (obra.capaUrl) { bannerEl.style.display=''; bannerImg.src=obra.capaUrl; }
  else bannerEl.style.display='none';
  // Capa
  const wrap = document.getElementById('obra-capa-wrap'); wrap.innerHTML='';
  if (obra.capaUrl) {
    const img = document.createElement('img'); img.className='obra-capa-modal'; img.src=obra.capaUrl;
    img.addEventListener('click', () => document.getElementById('input-trocar-capa').click()); wrap.appendChild(img);
  } else {
    const ph = document.createElement('div'); ph.className='obra-capa-placeholder-modal'; ph.textContent='📖';
    ph.addEventListener('click', () => document.getElementById('input-trocar-capa').click()); wrap.appendChild(ph);
  }
  // Título e meta
  document.getElementById('obra-titulo-modal').textContent = obra.titulo;
  document.getElementById('obra-titulo-original-modal').textContent = obra.tituloOriginal||'';
  const notaEl = document.getElementById('obra-nota-modal');
  notaEl.innerHTML = obra.nota ? `⭐ <strong>${obra.nota}</strong>` : ''; notaEl.style.display = obra.nota ? '' : 'none';
  const anoEl = document.getElementById('obra-ano-modal');
  anoEl.textContent = obra.ano ? `📅 ${obra.ano}` : ''; anoEl.style.display = obra.ano ? '' : 'none';
  const statusEl = document.getElementById('obra-status-modal');
  statusEl.textContent = obra.status||''; statusEl.style.display = obra.status ? '' : 'none';
  // Tags
  const tagsEl = document.getElementById('obra-tags-modal'); tagsEl.innerHTML='';
  (obra.tags||[]).forEach(tag => { const t=document.createElement('span'); t.className='obra-tag'; t.textContent=tag; tagsEl.appendChild(t); });
  // Descrição
  const descEl = document.getElementById('obra-descricao-modal');
  descEl.textContent = obra.descricao||''; descEl.style.display = obra.descricao ? '' : 'none';
  document.getElementById('obra-sub-modal').textContent = `${obra.capitulos.length} capítulo${obra.capitulos.length!==1?'s':''}`;
  // Capítulos
  const listaEl = document.getElementById('capitulos-lista-modal'); listaEl.innerHTML='';
  const caps = [...obra.capitulos].sort((a,b) => parseFloat(b.numero)-parseFloat(a.numero));
  caps.forEach(cap => {
    const item = document.createElement('div'); item.className='cap-item';
    const nome = document.createElement('span'); nome.className='cap-item-nome'; nome.textContent=`Cap. ${cap.numero}`;
    const acoes = document.createElement('div'); acoes.style.cssText='display:flex;gap:6px;align-items:center';
    const btnShare = document.createElement('button'); btnShare.className='cap-item-del'; btnShare.title='Migrar'; btnShare.textContent='🔗'; btnShare.style.color='#7ecfff';
    btnShare.addEventListener('click', e => { e.stopPropagation(); window.migrarCapitulo&&window.migrarCapitulo(obra.id,cap.id); });
    const btnDel = document.createElement('button'); btnDel.className='cap-item-del'; btnDel.title='Excluir'; btnDel.textContent='🗑';
    btnDel.addEventListener('click', async e => { e.stopPropagation(); if (!confirm(`Excluir cap. ${cap.numero}?`)) return; await deletarCapitulo(obra,cap.id); });
    acoes.appendChild(btnShare); acoes.appendChild(btnDel);
    item.appendChild(nome); item.appendChild(acoes);
    item.addEventListener('click', () => { fecharModalObra(); window.Leitor.abrirCapitulo(obra.id,cap.id); });
    listaEl.appendChild(item);
  });
  document.getElementById('modal-obra').style.display='flex';
  document.querySelector('#modal-obra .modal-sheet').scrollTop=0;
}

async function deletarCapitulo(obra, capId) {
  await DB.deletarPaginasCap(capId);
  obra.capitulos = obra.capitulos.filter(c => c.id!==capId);
  if (!obra.capitulos.length) obra.capaUrl=null;
  await DB.salvarObra(obra); fecharModalObra(); await renderizarBiblioteca(); mostrarToast('Capítulo excluído');
}
function fecharModalObra() { document.getElementById('modal-obra').style.display='none'; obraAtualModal=null; }

// Listeners
document.getElementById('btn-fechar-obra').addEventListener('click', fecharModalObra);
document.getElementById('modal-obra').addEventListener('click', e => { if (e.target===document.getElementById('modal-obra')) fecharModalObra(); });
document.getElementById('btn-continuar-leitura').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  const capId = obraAtualModal.ultimoCapId ?? obraAtualModal.capitulos[obraAtualModal.capitulos.length-1]?.id;
  if (!capId) return; const id=obraAtualModal.id; fecharModalObra(); window.Leitor.abrirCapitulo(id,capId);
});
document.getElementById('btn-add-proximo').addEventListener('click', () => {
  if (!obraAtualModal) return;
  const ultimo = Math.max(...obraAtualModal.capitulos.map(c=>parseFloat(c.numero)||0));
  const preset = {nomeObra:obraAtualModal.titulo, capitulo:isFinite(ultimo)?String(ultimo+1):''};
  fecharModalObra(); window._importPreset=preset; document.getElementById('modal-importar').style.display='flex';
});
document.getElementById('btn-deletar-obra').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  if (!confirm(`Excluir "${obraAtualModal.titulo}"?`)) return;
  const obra=obraAtualModal; fecharModalObra(); await DB.deletarObra(obra.id,obra); await renderizarBiblioteca(); mostrarToast('Obra excluída');
});
document.getElementById('input-trocar-capa').addEventListener('change', async e => {
  if (!e.target.files[0]||!obraAtualModal) return;
  const obraId=obraAtualModal.id; const novaCapaUrl=await gerarCapaDeArquivo(e.target.files[0]); e.target.value='';
  const obra=await DB.buscarObra(obraId); if (!obra) return; obra.capaUrl=novaCapaUrl; await DB.salvarObra(obra);
  await renderizarBiblioteca(); await abrirModalObra(obraId); mostrarToast('Capa atualizada!');
});
document.getElementById('btn-trocar-capa').addEventListener('click', () => document.getElementById('input-trocar-capa').click());
document.getElementById('btn-editar-descricao').addEventListener('click', () => {
  if (!obraAtualModal) return;
  window._editandoDescricaoObraId=obraAtualModal.id; document.getElementById('input-descricao').value=obraAtualModal.descricao||'';
  document.getElementById('modal-obra').style.display='none'; document.getElementById('modal-descricao').style.display='flex';
});
document.getElementById('btn-descricao-cancelar').addEventListener('click', async () => {
  document.getElementById('modal-descricao').style.display='none';
  if (window._editandoDescricaoObraId) { await abrirModalObra(window._editandoDescricaoObraId); window._editandoDescricaoObraId=null; }
});
document.getElementById('btn-descricao-salvar').addEventListener('click', async () => {
  const obraId=window._editandoDescricaoObraId; if (!obraId) return;
  const obra=await DB.buscarObra(obraId); if (!obra) return;
  obra.descricao=document.getElementById('input-descricao').value.trim(); await DB.salvarObra(obra);
  document.getElementById('modal-descricao').style.display='none'; window._editandoDescricaoObraId=null;
  await abrirModalObra(obraId); mostrarToast('Descrição salva!');
});
document.getElementById('btn-derivar-descricao-web').addEventListener('click', async () => {
  const obraId=window._editandoDescricaoObraId; if (!obraId) return;
  const obra=await DB.buscarObra(obraId); if (!obra) return;
  const btn=document.getElementById('btn-derivar-descricao-web'); btn.textContent='⏳ Buscando…'; btn.disabled=true;
  try { const d=await derivarObraWeb(obra.titulo); if (d?.descricao) { document.getElementById('input-descricao').value=d.descricao; mostrarToast('Descrição encontrada!'); } else mostrarToast('Nenhuma descrição encontrada'); }
  catch(e) { mostrarToast('Erro: '+e.message); }
  btn.textContent='🌐 Derivar descrição da web'; btn.disabled=false;
});
document.getElementById('btn-derivar-obra-existente').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  window._derivarParaObraId=obraAtualModal.id; document.getElementById('input-derivar-nome').value=obraAtualModal.titulo;
  document.getElementById('derivar-progresso').style.display='none'; document.getElementById('derivar-resultado').style.display='none';
  document.getElementById('btn-derivar-confirmar').disabled=false; document.getElementById('btn-derivar-confirmar').textContent='Buscar';
  document.getElementById('btn-derivar-confirmar').dataset.fase='';
  fecharModalObra(); document.getElementById('modal-derivar').style.display='flex';
});

async function gerarCapaDeArquivo(file) {
  return new Promise(res => {
    const url=URL.createObjectURL(file); const img=new Image();
    img.onload=()=>{ const c=document.createElement('canvas'); c.width=160; c.height=220; const ctx=c.getContext('2d'); const r=Math.max(160/img.width,220/img.height); ctx.drawImage(img,(160-img.width*r)/2,(220-img.height*r)/2,img.width*r,img.height*r); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',0.82)); };
    img.onerror=()=>{ URL.revokeObjectURL(url); res(null); }; img.src=url;
  });
}

async function derivarObraWeb(nome) {
  // Tentar até 3 vezes com delay para lidar com rate-limit do Jikan
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      if (tentativa > 0) await new Promise(res => setTimeout(res, 1500 * tentativa));
      const url = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(nome)}&limit=3&order_by=score&sort=desc`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (r.status === 429) { continue; } // rate limit - tentar de novo
      if (!r.ok) throw new Error(`Servidor retornou ${r.status}`);
      const data = await r.json();
      const item = data?.data?.[0];
      if (!item) return null;
      return {
        tituloOficial: item.title_english || item.title || nome,
        tituloOriginal: item.title_japanese || item.title || '',
        descricao: (item.synopsis || '').replace(/\[Written by.*?\]/g, '').trim(),
        capaUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
        nota: item.score ? item.score.toFixed(2) : null,
        ano: item.published?.prop?.from?.year || null,
        status: item.status || null,
        tags: [
          ...(item.genres?.map(g => g.name) || []),
          ...(item.themes?.map(t => t.name) || []),
          ...(item.demographics?.map(d => d.name) || []),
        ].filter(Boolean).slice(0, 10),
      };
    } catch(e) {
      if (tentativa === 2) throw new Error('API Jikan indisponível. Tente novamente em alguns segundos.');
    }
  }
  return null;
}

window.Biblioteca = {renderizarBiblioteca, abrirModalObra, derivarObraWeb};
