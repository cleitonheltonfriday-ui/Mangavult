// app.js — v5

function mostrarTela(id) { document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id===id)); }
function mostrarToast(msg, dur=2800) {
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('visivel');
  clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('visivel'),dur);
}
async function gerarCapa(blob) {
  return new Promise(res=>{
    const url=URL.createObjectURL(blob); const img=new Image();
    img.onload=()=>{ const c=document.createElement('canvas'); c.width=160; c.height=220; const ctx=c.getContext('2d'); const r=Math.max(160/img.width,220/img.height); ctx.drawImage(img,(160-img.width*r)/2,(220-img.height*r)/2,img.width*r,img.height*r); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',0.75)); };
    img.onerror=()=>{ URL.revokeObjectURL(url); res(null); }; img.src=url;
  });
}

// Splash
function mostrarSplash() {
  return new Promise(res=>{
    const s=document.getElementById('splash'); s.style.display='flex';
    setTimeout(()=>{ s.classList.add('saindo'); setTimeout(()=>{ s.style.display='none'; res(); },600); },2200);
  });
}

// Boas-vindas
function verificarBoasVindas() { if (localStorage.getItem('mvBoasVindas')!=='nunca') setTimeout(()=>document.getElementById('modal-boas-vindas').style.display='flex',200); }

let arquivoPendente=null, tipoPendente=null;
window._importPreset=null;

document.addEventListener('DOMContentLoaded', async ()=>{
  // Boas-vindas
  document.getElementById('btn-bv-fechar').addEventListener('click',()=>{ document.getElementById('modal-boas-vindas').style.display='none'; document.getElementById('modal-bv-pref').style.display='flex'; });
  document.getElementById('btn-bv-nunca').addEventListener('click',()=>{ localStorage.setItem('mvBoasVindas','nunca'); document.getElementById('modal-bv-pref').style.display='none'; });
  document.getElementById('btn-bv-sempre').addEventListener('click',()=>{ localStorage.setItem('mvBoasVindas','sempre'); document.getElementById('modal-bv-pref').style.display='none'; });
  document.getElementById('btn-bv-pref-fechar').addEventListener('click',()=>{ localStorage.setItem('mvBoasVindas','sempre'); document.getElementById('modal-bv-pref').style.display='none'; });

  // Menu principal
  document.getElementById('btn-menu-principal').addEventListener('click',()=>document.getElementById('modal-menu-principal').style.display='flex');
  document.getElementById('btn-fechar-menu-principal').addEventListener('click',()=>document.getElementById('modal-menu-principal').style.display='none');
  document.getElementById('menu-importar').addEventListener('click',()=>{ document.getElementById('modal-menu-principal').style.display='none'; document.getElementById('modal-importar').style.display='flex'; });
  document.getElementById('menu-armazenamento').addEventListener('click',()=>{ document.getElementById('modal-menu-principal').style.display='none'; mostrarArmazenamento(); });
  document.getElementById('menu-migrar-acesso').addEventListener('click',()=>{ document.getElementById('modal-menu-principal').style.display='none'; executarMigracaoAcesso(); });
  document.getElementById('menu-remigrar-acesso').addEventListener('click',()=>{ document.getElementById('modal-menu-principal').style.display='none'; document.getElementById('modal-remigrar-acesso').style.display='flex'; });
  document.getElementById('menu-sobre').addEventListener('click',()=>{ document.getElementById('modal-menu-principal').style.display='none'; document.getElementById('modal-boas-vindas').style.display='flex'; });
  document.getElementById('btn-fechar-armazenamento').addEventListener('click',()=>document.getElementById('modal-armazenamento').style.display='none');

  // Busca
  document.getElementById('btn-busca').addEventListener('click',()=>{ document.getElementById('busca-wrap').classList.add('visivel'); document.getElementById('busca-input').focus(); });
  document.getElementById('busca-fechar').addEventListener('click',()=>{ document.getElementById('busca-wrap').classList.remove('visivel'); document.getElementById('busca-input').value=''; Biblioteca.renderizarBiblioteca(); });
  document.getElementById('busca-input').addEventListener('input',e=>Biblioteca.renderizarBiblioteca(e.target.value));

  // FAB
  document.getElementById('btn-importar').addEventListener('click',()=>{ window._importPreset=null; document.getElementById('modal-importar').style.display='flex'; });
  document.getElementById('btn-cancelar-import').addEventListener('click',()=>document.getElementById('modal-importar').style.display='none');
  document.getElementById('modal-importar').addEventListener('click',e=>{ if (e.target===document.getElementById('modal-importar')) document.getElementById('modal-importar').style.display='none'; });

  // Inputs arquivo
  document.getElementById('input-zip').addEventListener('change',e=>{ if(!e.target.files[0]) return; arquivoPendente=e.target.files[0]; tipoPendente='zip'; e.target.value=''; document.getElementById('modal-importar').style.display='none'; abrirFormulario(); });
  document.getElementById('input-imgs').addEventListener('change',e=>{ if(!e.target.files.length) return; arquivoPendente=Array.from(e.target.files); tipoPendente='imgs'; e.target.value=''; document.getElementById('modal-importar').style.display='none'; abrirFormulario(); });
  document.getElementById('input-pdf').addEventListener('change',e=>{ if(!e.target.files[0]) return; arquivoPendente=e.target.files[0]; tipoPendente='pdf'; e.target.value=''; document.getElementById('modal-importar').style.display='none'; abrirFormulario(); });

  // Derivar obra
  document.getElementById('btn-derivar-obra').addEventListener('click',()=>{ document.getElementById('modal-importar').style.display='none'; window._derivarParaObraId=null; document.getElementById('input-derivar-nome').value=''; document.getElementById('derivar-progresso').style.display='none'; document.getElementById('derivar-resultado').style.display='none'; const btn=document.getElementById('btn-derivar-confirmar'); btn.disabled=false; btn.textContent='Buscar'; btn.dataset.fase=''; document.getElementById('modal-derivar').style.display='flex'; });
  document.getElementById('btn-derivar-cancelar').addEventListener('click',()=>{ document.getElementById('modal-derivar').style.display='none'; if (window._derivarParaObraId) { Biblioteca.abrirModalObra(window._derivarParaObraId); window._derivarParaObraId=null; } });
  document.getElementById('btn-derivar-confirmar').addEventListener('click', executarDerivarObra);

  // Formulário capítulo
  document.getElementById('btn-form-cancelar').addEventListener('click',()=>{ document.getElementById('modal-formulario').style.display='none'; arquivoPendente=null; tipoPendente=null; });
  document.getElementById('modal-formulario').addEventListener('click',e=>{ if(e.target===document.getElementById('modal-formulario')) document.getElementById('modal-formulario').style.display='none'; });
  document.getElementById('btn-form-salvar').addEventListener('click', importarCapitulo);

  // Remigrar cap
  document.getElementById('btn-remigrar-cap').addEventListener('click',()=>{ document.getElementById('modal-importar').style.display='none'; document.getElementById('modal-remigrar').style.display='flex'; });
  document.getElementById('btn-remigrar-cancelar').addEventListener('click',()=>document.getElementById('modal-remigrar').style.display='none');
  document.getElementById('btn-remigrar-confirmar').addEventListener('click', executarRemigrarCap);

  // Remigrar acesso
  document.getElementById('btn-remigrar-acesso-cancelar').addEventListener('click',()=>document.getElementById('modal-remigrar-acesso').style.display='none');
  document.getElementById('btn-remigrar-acesso-confirmar').addEventListener('click', executarRemigrarAcesso);

  await mostrarSplash();
  await Biblioteca.renderizarBiblioteca();
  mostrarTela('tela-biblioteca');
  verificarBoasVindas();
});

function abrirFormulario() {
  const p=window._importPreset;
  document.getElementById('input-nome-obra').value=p?.nomeObra??'';
  document.getElementById('input-capitulo').value=p?.capitulo??'';
  document.getElementById('progresso-import').style.display='none';
  document.getElementById('btn-form-salvar').disabled=false;
  document.getElementById('modal-formulario').style.display='flex';
  setTimeout(()=>document.getElementById('input-nome-obra').focus(),100);
}

async function importarCapitulo() {
  const nomeObra=document.getElementById('input-nome-obra').value.trim();
  const numCap=document.getElementById('input-capitulo').value.trim();
  if (!nomeObra) { mostrarToast('Informe o nome da obra'); return; }
  if (!numCap) { mostrarToast('Informe o capítulo'); return; }
  if (!arquivoPendente) { mostrarToast('Nenhum arquivo selecionado'); return; }
  document.getElementById('btn-form-salvar').disabled=true;
  const fillEl=document.getElementById('progresso-fill'); const textoEl=document.getElementById('progresso-texto');
  document.getElementById('progresso-import').style.display='block';
  const onProgress=(pct,msg)=>{ fillEl.style.width=pct+'%'; textoEl.textContent=msg; };
  try {
    let blobs=[];
    if (tipoPendente==='zip') blobs=await Importar.extrairZip(arquivoPendente,onProgress);
    else if (tipoPendente==='imgs') { onProgress(50,'Carregando…'); blobs=arquivoPendente; onProgress(100,'Concluído'); }
    else if (tipoPendente==='pdf') blobs=await Importar.extrairPDF(arquivoPendente,onProgress);
    if (!blobs.length) throw new Error('Nenhuma imagem encontrada.');
    onProgress(100,'Salvando…');
    const capId=`cap_${Date.now()}`; const obraId=nomeObra.toLowerCase().replace(/[^a-z0-9]/g,'_');
    await DB.salvarPaginasCap(capId,blobs);
    let obra=await DB.buscarObra(obraId);
    if (!obra) obra={id:obraId,titulo:nomeObra,capitulos:[],capaUrl:null,descricao:''};
    if (!obra.capaUrl&&blobs.length) obra.capaUrl=await gerarCapa(blobs[0]);
    if (!obra.capitulos.find(c=>c.numero===numCap)) { obra.capitulos.push({id:capId,numero:numCap}); obra.capitulos.sort((a,b)=>parseFloat(a.numero)-parseFloat(b.numero)); }
    await DB.salvarObra(obra);
    document.getElementById('modal-formulario').style.display='none'; arquivoPendente=null; tipoPendente=null;
    await Biblioteca.renderizarBiblioteca(); mostrarToast(`Cap. ${numCap} importado! ✓`);
    setTimeout(()=>perguntarAcaoPosImport(obra,{id:capId,numero:numCap}),300);
  } catch(err) { mostrarToast('Erro: '+err.message); document.getElementById('btn-form-salvar').disabled=false; document.getElementById('progresso-import').style.display='none'; }
}

function perguntarAcaoPosImport(obra,cap) {
  const ov=document.createElement('div'); ov.className='modal-overlay'; ov.style.display='flex';
  const prox=parseFloat(cap.numero)+1;
  ov.innerHTML=`<div class="modal-sheet"><div class="modal-handle"></div><h2 class="modal-titulo">Cap. ${cap.numero} importado! ✓</h2><div style="display:flex;flex-direction:column;gap:10px"><button class="btn-primario" id="ppi-ler">▶ Ler agora</button><button class="btn-secundario" id="ppi-prox">+ Adicionar cap. ${prox}</button><button class="btn-cancelar" id="ppi-bib">Voltar para biblioteca</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#ppi-ler').addEventListener('click',()=>{ ov.remove(); Leitor.abrirCapitulo(obra.id,cap.id); });
  ov.querySelector('#ppi-prox').addEventListener('click',()=>{ ov.remove(); window._importPreset={nomeObra:obra.titulo,capitulo:String(prox)}; document.getElementById('modal-importar').style.display='flex'; });
  ov.querySelector('#ppi-bib').addEventListener('click',()=>ov.remove());
}

async function executarDerivarObra() {
  const nomeBuscado=document.getElementById('input-derivar-nome').value.trim();
  if (!nomeBuscado) { mostrarToast('Informe o nome da obra'); return; }
  const btn=document.getElementById('btn-derivar-confirmar');

  if (btn.dataset.fase !== 'confirmar') {
    btn.disabled=true;
    document.getElementById('derivar-progresso').style.display='block';
    document.getElementById('derivar-fill').style.width='0%';
    document.getElementById('derivar-texto').textContent='Buscando na web…';
    document.getElementById('derivar-resultado').style.display='none';
    try {
      let p=0; const iv=setInterval(()=>{ p=Math.min(p+8,85); document.getElementById('derivar-fill').style.width=p+'%'; },200);
      const dados=await Biblioteca.derivarObraWeb(nomeBuscado);
      clearInterval(iv); document.getElementById('derivar-fill').style.width='100%';
      if (!dados) { document.getElementById('derivar-texto').textContent='Nenhum resultado encontrado'; btn.disabled=false; return; }
      btn.dataset.fase='confirmar'; btn.dataset.dadosJson=JSON.stringify(dados);
      document.getElementById('derivar-progresso').style.display='none';
      const res=document.getElementById('derivar-resultado'); res.style.display='';
      document.getElementById('derivar-res-titulo').textContent=dados.tituloOficial;
      document.getElementById('derivar-res-original').textContent=dados.tituloOriginal||'';
      document.getElementById('derivar-res-ano').textContent=dados.ano?`📅 ${dados.ano}`:'';
      document.getElementById('derivar-res-nota').textContent=dados.nota?`⭐ ${dados.nota}`:'';
      const tagsEl=document.getElementById('derivar-res-tags'); tagsEl.innerHTML='';
      (dados.tags||[]).slice(0,6).forEach(tag=>{ const s=document.createElement('span'); s.className='obra-tag'; s.textContent=tag; tagsEl.appendChild(s); });
      document.getElementById('derivar-res-desc').textContent=(dados.descricao||'').slice(0,200)+(dados.descricao?.length>200?'…':'');
      const capaP=document.getElementById('derivar-res-capa');
      if (dados.capaUrl) { capaP.src=dados.capaUrl; capaP.style.display=''; } else capaP.style.display='none';
      btn.textContent='✓ Confirmar e salvar'; btn.disabled=false;
    } catch(err) { document.getElementById('derivar-progresso').style.display='none'; mostrarToast('Erro: '+err.message); btn.disabled=false; }
    return;
  }

  // Fase 2: salvar
  btn.disabled=true;
  const dados=JSON.parse(btn.dataset.dadosJson);
  btn.dataset.fase=''; btn.dataset.dadosJson=''; btn.textContent='Buscar';
  const tituloFinal=dados.tituloOficial;
  const obraIdExistente=window._derivarParaObraId; window._derivarParaObraId=null;
  const obraId=obraIdExistente||tituloFinal.toLowerCase().replace(/[^a-z0-9]/g,'_');
  let obra=await DB.buscarObra(obraId);
  if (!obra&&obraIdExistente) obra=await DB.buscarObra(obraIdExistente);
  if (!obra) obra={id:obraId,titulo:tituloFinal,capitulos:[],capaUrl:null,descricao:''};
  obra.titulo=tituloFinal; obra.tituloOriginal=dados.tituloOriginal||''; obra.descricao=dados.descricao||obra.descricao||'';
  obra.nota=dados.nota||obra.nota||null; obra.ano=dados.ano||obra.ano||null; obra.status=dados.status||obra.status||null;
  obra.tags=dados.tags?.length?dados.tags:(obra.tags||[]);
  if (dados.capaUrl) { try { const img=new Image(); img.crossOrigin='anonymous'; await new Promise((r,j)=>{ img.onload=r; img.onerror=j; img.src=dados.capaUrl+'?nc='+Date.now(); }); const cv=document.createElement('canvas'); cv.width=160; cv.height=220; const ctx=cv.getContext('2d'); const r=Math.max(160/img.width,220/img.height); ctx.drawImage(img,(160-img.width*r)/2,(220-img.height*r)/2,img.width*r,img.height*r); obra.capaUrl=cv.toDataURL('image/jpeg',0.82); } catch { obra.capaUrl=dados.capaUrl; } }
  await DB.salvarObra(obra); document.getElementById('modal-derivar').style.display='none';
  await Biblioteca.renderizarBiblioteca(); mostrarToast(`"${tituloFinal}" salvo! ✓`);
  btn.disabled=false;
  if (obraIdExistente) setTimeout(()=>Biblioteca.abrirModalObra(obraId),400);
}

async function mostrarArmazenamento() {
  const obras=await DB.buscarTodasObras(); const total=obras.reduce((s,o)=>s+o.capitulos.length,0); let usado='?';
  try { const e=await navigator.storage.estimate(); usado=`${(e.usage/1024/1024).toFixed(1)} MB`; } catch{}
  document.getElementById('armazenamento-info').innerHTML=`<div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px"><span>Obras</span><strong>${obras.length}</strong></div><div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px"><span>Capítulos</span><strong>${total}</strong></div><div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px"><span>Espaço usado</span><strong>${usado}</strong></div></div>`;
  document.getElementById('modal-armazenamento').style.display='flex';
}

async function executarMigracaoAcesso() {
  mostrarToast('Preparando exportação…',60000);
  try {
    const obras=await DB.buscarTodasObras(); const pacote={v:2,tipo:'acesso',obras:[]};
    for (const obra of obras) {
      const capsData=[];
      for (const cap of obra.capitulos) { const blobs=await DB.buscarPaginasCap(cap.id); const paginasB64=await Promise.all(blobs.map(b=>new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); }))); capsData.push({numero:cap.numero,paginas:paginasB64}); }
      pacote.obras.push({id:obra.id,titulo:obra.titulo,tituloOriginal:obra.tituloOriginal||'',descricao:obra.descricao||'',capaUrl:obra.capaUrl||'',nota:obra.nota||null,ano:obra.ano||null,status:obra.status||null,tags:obra.tags||[],capitulos:capsData});
    }
    const blob=new Blob([JSON.stringify(pacote)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`mangavult_backup_${Date.now()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    mostrarToast('Backup baixado! ✓');
  } catch(err) { mostrarToast('Erro: '+err.message); }
}

async function executarRemigrarAcesso() {
  const file=document.getElementById('input-remigrar-acesso-arquivo').files[0];
  if (!file) { mostrarToast('Selecione o arquivo .json'); return; }
  document.getElementById('btn-remigrar-acesso-confirmar').disabled=true; mostrarToast('Importando…',60000);
  try {
    const pacote=JSON.parse(await file.text()); if (!pacote.obras) throw new Error('Arquivo inválido');
    for (const obraData of pacote.obras) {
      const obra={id:obraData.id,titulo:obraData.titulo,tituloOriginal:obraData.tituloOriginal||'',descricao:obraData.descricao,capaUrl:obraData.capaUrl,nota:obraData.nota||null,ano:obraData.ano||null,status:obraData.status||null,tags:obraData.tags||[],capitulos:[]};
      for (const capData of obraData.capitulos) { const capId=`cap_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; const blobs=capData.paginas.map(d=>{ const a=d.split(','); const mime=a[0].match(/:(.*?);/)[1]; const b=atob(a[1]); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Blob([u],{type:mime}); }); await DB.salvarPaginasCap(capId,blobs); obra.capitulos.push({id:capId,numero:capData.numero}); }
      obra.capitulos.sort((a,b)=>parseFloat(a.numero)-parseFloat(b.numero)); await DB.salvarObra(obra);
    }
    await Biblioteca.renderizarBiblioteca(); document.getElementById('modal-remigrar-acesso').style.display='none'; mostrarToast(`${pacote.obras.length} obra(s) importada(s)! ✓`);
  } catch(err) { mostrarToast('Erro: '+err.message); }
  document.getElementById('btn-remigrar-acesso-confirmar').disabled=false;
}

window.migrarCapitulo=async(obraId,capId)=>{
  mostrarToast('Preparando arquivo…',10000);
  try {
    const obra=await DB.buscarObra(obraId); const blobs=await DB.buscarPaginasCap(capId); const cap=obra.capitulos.find(c=>c.id===capId);
    const paginasB64=await Promise.all(blobs.map(b=>new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); })));
    const payload={v:2,tipo:'cap',obra:{id:obra.id,titulo:obra.titulo,tituloOriginal:obra.tituloOriginal||'',descricao:obra.descricao||'',capaUrl:obra.capaUrl||'',nota:obra.nota||null,ano:obra.ano||null,status:obra.status||null,tags:obra.tags||[]},cap:{numero:cap.numero},paginas:paginasB64};
    const blob=new Blob([JSON.stringify(payload)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${obra.titulo}_cap${cap.numero}.mvchapter`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    mostrarToast(`Cap. ${cap.numero} baixado! ✓`);
  } catch(err) { mostrarToast('Erro: '+err.message); }
};

async function executarRemigrarCap() {
  const file=document.getElementById('input-remigrar-arquivo').files[0];
  if (!file) { mostrarToast('Selecione o arquivo .mvchapter'); return; }
  document.getElementById('btn-remigrar-confirmar').disabled=true; mostrarToast('Importando…',10000);
  try {
    const payload=JSON.parse(await file.text()); if (payload.tipo!=='cap') throw new Error('Arquivo inválido');
    const capId=`cap_${Date.now()}`; const obraId=payload.obra.id;
    const blobs=payload.paginas.map(d=>{ const a=d.split(','); const mime=a[0].match(/:(.*?);/)[1]; const b=atob(a[1]); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Blob([u],{type:mime}); });
    await DB.salvarPaginasCap(capId,blobs);
    let obra=await DB.buscarObra(obraId);
    if (!obra) obra={id:obraId,titulo:payload.obra.titulo,tituloOriginal:payload.obra.tituloOriginal||'',descricao:payload.obra.descricao||'',capaUrl:payload.obra.capaUrl||null,nota:payload.obra.nota||null,ano:payload.obra.ano||null,status:payload.obra.status||null,tags:payload.obra.tags||[],capitulos:[]};
    if (!obra.capitulos.find(c=>c.numero===payload.cap.numero)) { obra.capitulos.push({id:capId,numero:payload.cap.numero}); obra.capitulos.sort((a,b)=>parseFloat(a.numero)-parseFloat(b.numero)); }
    await DB.salvarObra(obra); await Biblioteca.renderizarBiblioteca(); document.getElementById('modal-remigrar').style.display='none'; mostrarToast(`Cap. ${payload.cap.numero} importado! ✓`);
  } catch(err) { mostrarToast('Erro: '+err.message); }
  document.getElementById('btn-remigrar-confirmar').disabled=false;
}
