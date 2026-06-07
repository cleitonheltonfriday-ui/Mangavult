// ═══════════════════════════════════════════════
//  app.js — v4
// ═══════════════════════════════════════════════

// ── Utilitários globais ──
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === id));
}
function mostrarToast(msg, dur = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('visivel');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visivel'), dur);
}
async function gerarCapa(blob) {
  return new Promise(res => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width=160; c.height=220;
      const ctx = c.getContext('2d');
      const r = Math.max(160/img.width,220/img.height);
      ctx.drawImage(img,(160-img.width*r)/2,(220-img.height*r)/2,img.width*r,img.height*r);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

// ── Splash ──
function mostrarSplash() {
  return new Promise(res => {
    const splash = document.getElementById('splash');
    splash.style.display = 'flex';
    setTimeout(() => { splash.classList.add('saindo'); setTimeout(() => { splash.style.display='none'; res(); }, 600); }, 2200);
  });
}

// ── Boas-vindas ──
function verificarBoasVindas() {
  const p = localStorage.getItem('mvBoasVindas');
  if (p === 'nunca') return;
  setTimeout(() => document.getElementById('modal-boas-vindas').style.display='flex', 200);
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  // Boas-vindas
  document.getElementById('btn-bv-fechar').addEventListener('click', () => {
    document.getElementById('modal-boas-vindas').style.display='none';
    document.getElementById('modal-bv-pref').style.display='flex';
  });
  document.getElementById('btn-bv-nunca').addEventListener('click', () => { localStorage.setItem('mvBoasVindas','nunca'); document.getElementById('modal-bv-pref').style.display='none'; });
  document.getElementById('btn-bv-sempre').addEventListener('click', () => { localStorage.setItem('mvBoasVindas','sempre'); document.getElementById('modal-bv-pref').style.display='none'; });
  document.getElementById('btn-bv-pref-fechar').addEventListener('click', () => { localStorage.setItem('mvBoasVindas','sempre'); document.getElementById('modal-bv-pref').style.display='none'; });

  // Menu principal
  document.getElementById('btn-menu-principal').addEventListener('click', () => document.getElementById('modal-menu-principal').style.display='flex');
  document.getElementById('btn-fechar-menu-principal').addEventListener('click', () => document.getElementById('modal-menu-principal').style.display='none');
  document.getElementById('menu-importar').addEventListener('click', () => { document.getElementById('modal-menu-principal').style.display='none'; document.getElementById('modal-importar').style.display='flex'; });
  document.getElementById('menu-armazenamento').addEventListener('click', () => { document.getElementById('modal-menu-principal').style.display='none'; mostrarArmazenamento(); });
  document.getElementById('menu-migrar-acesso').addEventListener('click', () => { document.getElementById('modal-menu-principal').style.display='none'; executarMigracaoAcesso(); });
  document.getElementById('menu-remigrar-acesso').addEventListener('click', () => { document.getElementById('modal-menu-principal').style.display='none'; document.getElementById('modal-remigrar-acesso').style.display='flex'; });
  document.getElementById('menu-sobre').addEventListener('click', () => { document.getElementById('modal-menu-principal').style.display='none'; document.getElementById('modal-boas-vindas').style.display='flex'; });
  document.getElementById('btn-fechar-armazenamento').addEventListener('click', () => document.getElementById('modal-armazenamento').style.display='none');

  // Busca
  document.getElementById('btn-busca').addEventListener('click', () => { document.getElementById('busca-wrap').classList.add('visivel'); document.getElementById('busca-input').focus(); });
  document.getElementById('busca-fechar').addEventListener('click', () => { document.getElementById('busca-wrap').classList.remove('visivel'); document.getElementById('busca-input').value=''; Biblioteca.renderizarBiblioteca(); });
  document.getElementById('busca-input').addEventListener('input', e => Biblioteca.renderizarBiblioteca(e.target.value));

  // FAB importar
  document.getElementById('btn-importar').addEventListener('click', () => { window._importPreset=null; document.getElementById('modal-importar').style.display='flex'; });
  document.getElementById('btn-cancelar-import').addEventListener('click', () => document.getElementById('modal-importar').style.display='none');
  document.getElementById('modal-importar').addEventListener('click', e => { if (e.target===document.getElementById('modal-importar')) document.getElementById('modal-importar').style.display='none'; });

  // Inputs de arquivo
  document.getElementById('input-zip').addEventListener('change', e => { if(!e.target.files[0]) return; arquivoPendente=e.target.files[0]; tipoPendente='zip'; e.target.value=''; document.getElementById('modal-importar').style.display='none'; abrirFormulario(); });
  document.getElementById('input-imgs').addEventListener('change', e => { if(!e.target.files.length) return; arquivoPendente=Array.from(e.target.files); tipoPendente='imgs'; e.target.value=''; document.getElementById('modal-importar').style.display='none'; abrirFormulario(); });
  document.getElementById('input-pdf').addEventListener('change', e => { if(!e.target.files[0]) return; arquivoPendente=e.target.files[0]; tipoPendente='pdf'; e.target.value=''; document.getElementById('modal-importar').style.display='none'; abrirFormulario(); });

  // Derivar obra
  document.getElementById('btn-derivar-obra').addEventListener('click', () => { document.getElementById('modal-importar').style.display='none'; window._derivarParaObraId=null; document.getElementById('input-derivar-nome').value=''; document.getElementById('derivar-progresso').style.display='none'; document.getElementById('derivar-resultado').style.display='none'; document.getElementById('btn-derivar-confirmar').disabled=false; document.getElementById('btn-derivar-confirmar').textContent='Buscar'; document.getElementById('modal-derivar').style.display='flex'; });
  document.getElementById('btn-derivar-cancelar').addEventListener('click', () => { document.getElementById('modal-derivar').style.display='none'; if (window._derivarParaObraId) { Biblioteca.abrirModalObra(window._derivarParaObraId); window._derivarParaObraId=null; } });
  document.getElementById('btn-derivar-confirmar').addEventListener('click', executarDerivarObra);

  // Formulário capítulo
  document.getElementById('btn-form-cancelar').addEventListener('click', () => { document.getElementById('modal-formulario').style.display='none'; arquivoPendente=null; tipoPendente=null; });
  document.getElementById('modal-formulario').addEventListener('click', e => { if(e.target===document.getElementById('modal-formulario')) document.getElementById('modal-formulario').style.display='none'; });
  document.getElementById('btn-form-salvar').addEventListener('click', importarCapitulo);

  // Remigrar capítulo
  document.getElementById('btn-remigrar-cap').addEventListener('click', () => { document.getElementById('modal-importar').style.display='none'; document.getElementById('modal-remigrar').style.display='flex'; });
  document.getElementById('btn-remigrar-cancelar').addEventListener('click', () => document.getElementById('modal-remigrar').style.display='none');
  document.getElementById('btn-remigrar-confirmar').addEventListener('click', executarRemigrarCap);

  // Remigrar acesso
  document.getElementById('btn-remigrar-acesso-cancelar').addEventListener('click', () => document.getElementById('modal-remigrar-acesso').style.display='none');
  document.getElementById('btn-remigrar-acesso-confirmar').addEventListener('click', executarRemigrarAcesso);

  // Reader Settings abas
  document.querySelectorAll('.rs-aba').forEach(aba => {
    aba.addEventListener('click', () => {
      document.querySelectorAll('.rs-aba').forEach(a => a.classList.remove('ativo'));
      aba.classList.add('ativo');
      const alvo = aba.dataset.aba;
      ['layout','fit','behaviors'].forEach(id => {
        document.getElementById(`rs-aba-${id}`).style.display = id===alvo ? '' : 'none';
      });
    });
  });
  document.getElementById('modal-reader-settings').addEventListener('click', e => { if(e.target===document.getElementById('modal-reader-settings')) document.getElementById('modal-reader-settings').style.display='none'; });

  await mostrarSplash();
  await Biblioteca.renderizarBiblioteca();
  mostrarTela('tela-biblioteca');
  verificarBoasVindas();
});

// ── Importação ──
let arquivoPendente = null, tipoPendente = null;
window._importPreset = null;

function abrirFormulario() {
  const p = window._importPreset;
  document.getElementById('input-nome-obra').value = p?.nomeObra ?? '';
  document.getElementById('input-capitulo').value = p?.capitulo ?? '';
  document.getElementById('progresso-import').style.display = 'none';
  document.getElementById('btn-form-salvar').disabled = false;
  document.getElementById('modal-formulario').style.display = 'flex';
  setTimeout(() => document.getElementById('input-nome-obra').focus(), 100);
}

async function importarCapitulo() {
  const nomeObra = document.getElementById('input-nome-obra').value.trim();
  const numCap   = document.getElementById('input-capitulo').value.trim();
  if (!nomeObra) { mostrarToast('Informe o nome da obra'); return; }
  if (!numCap)   { mostrarToast('Informe o capítulo'); return; }
  if (!arquivoPendente) { mostrarToast('Nenhum arquivo selecionado'); return; }
  document.getElementById('btn-form-salvar').disabled = true;
  const progEl = document.getElementById('progresso-import');
  const fillEl = document.getElementById('progresso-fill');
  const textoEl = document.getElementById('progresso-texto');
  progEl.style.display = 'block';
  const onProgress = (pct, msg) => { fillEl.style.width=pct+'%'; textoEl.textContent=msg; };
  try {
    let blobs = [];
    if (tipoPendente==='zip')       blobs = await Importar.extrairZip(arquivoPendente, onProgress);
    else if (tipoPendente==='imgs') { onProgress(50,'Carregando…'); blobs=arquivoPendente; onProgress(100,'Concluído'); }
    else if (tipoPendente==='pdf')  blobs = await Importar.extrairPDF(arquivoPendente, onProgress);
    if (!blobs.length) throw new Error('Nenhuma imagem encontrada.');
    onProgress(100,'Salvando…');
    const capId  = `cap_${Date.now()}`;
    const obraId = nomeObra.toLowerCase().replace(/[^a-z0-9]/g,'_');
    await DB.salvarPaginasCap(capId, blobs);
    let obra = await DB.buscarObra(obraId);
    if (!obra) obra = { id:obraId, titulo:nomeObra, capitulos:[], capaUrl:null, descricao:'' };
    if (!obra.capaUrl && blobs.length) obra.capaUrl = await gerarCapa(blobs[0]);
    if (!obra.capitulos.find(c => c.numero===numCap)) {
      obra.capitulos.push({ id:capId, numero:numCap });
      obra.capitulos.sort((a,b) => parseFloat(a.numero)-parseFloat(b.numero));
    }
    await DB.salvarObra(obra);
    document.getElementById('modal-formulario').style.display = 'none';
    arquivoPendente=null; tipoPendente=null;
    await Biblioteca.renderizarBiblioteca();
    mostrarToast(`Cap. ${numCap} importado! ✓`);
    setTimeout(() => perguntarAcaoPosImport(obra, {id:capId, numero:numCap}), 300);
  } catch(err) { mostrarToast('Erro: '+err.message); document.getElementById('btn-form-salvar').disabled=false; progEl.style.display='none'; }
}

function perguntarAcaoPosImport(obra, cap) {
  const overlay = document.createElement('div');
  overlay.className='modal-overlay'; overlay.style.display='flex';
  const prox = parseFloat(cap.numero)+1;
  overlay.innerHTML=`<div class="modal-sheet"><div class="modal-handle"></div><h2 class="modal-titulo">Cap. ${cap.numero} importado! ✓</h2><div style="display:flex;flex-direction:column;gap:10px"><button class="btn-primario" id="ppi-ler">▶ Ler agora</button><button class="btn-secundario" id="ppi-proximo">+ Adicionar capítulo ${prox}</button><button class="btn-cancelar" id="ppi-biblioteca">Voltar para biblioteca</button></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#ppi-ler').addEventListener('click', () => { overlay.remove(); Leitor.abrirCapitulo(obra.id, cap.id); });
  overlay.querySelector('#ppi-proximo').addEventListener('click', () => { overlay.remove(); window._importPreset={nomeObra:obra.titulo, capitulo:String(prox)}; document.getElementById('modal-importar').style.display='flex'; });
  overlay.querySelector('#ppi-biblioteca').addEventListener('click', () => overlay.remove());
}

// ── Derivar obra da web (com correção de título) ──
async function executarDerivarObra() {
  const nomeBuscado = document.getElementById('input-derivar-nome').value.trim();
  if (!nomeBuscado) { mostrarToast('Informe o nome da obra'); return; }

  const btn = document.getElementById('btn-derivar-confirmar');

  // FASE 1: Buscar e mostrar resultado para confirmação
  if (btn.dataset.fase !== 'confirmar') {
    btn.disabled = true;
    document.getElementById('derivar-progresso').style.display = 'block';
    document.getElementById('derivar-fill').style.width = '0%';
    document.getElementById('derivar-texto').textContent = 'Buscando na web…';
    document.getElementById('derivar-resultado').style.display = 'none';

    try {
      // Animação de progresso
      let p = 0;
      const interval = setInterval(() => { p = Math.min(p+8, 85); document.getElementById('derivar-fill').style.width=p+'%'; }, 200);

      const dados = await Biblioteca.derivarObraWeb(nomeBuscado);
      clearInterval(interval);
      document.getElementById('derivar-fill').style.width = '100%';

      if (!dados) {
        document.getElementById('derivar-texto').textContent = 'Nenhum resultado encontrado';
        btn.disabled = false; return;
      }

      // Guardar dados para usar na fase 2
      btn.dataset.fase = 'confirmar';
      btn.dataset.dadosJson = JSON.stringify(dados);
      document.getElementById('derivar-progresso').style.display = 'none';

      // Mostrar preview do resultado
      const resultEl = document.getElementById('derivar-resultado');
      resultEl.style.display = '';
      document.getElementById('derivar-res-titulo').textContent = dados.tituloOficial;
      document.getElementById('derivar-res-original').textContent = dados.tituloOriginal || '';
      document.getElementById('derivar-res-ano').textContent = dados.ano ? `📅 ${dados.ano}` : '';
      document.getElementById('derivar-res-nota').textContent = dados.nota ? `⭐ ${dados.nota}` : '';
      const tagsEl = document.getElementById('derivar-res-tags');
      tagsEl.innerHTML = '';
      (dados.tags||[]).slice(0,6).forEach(tag => { const s=document.createElement('span'); s.className='obra-tag'; s.textContent=tag; tagsEl.appendChild(s); });
      document.getElementById('derivar-res-desc').textContent = (dados.descricao||'').slice(0,200) + (dados.descricao?.length>200?'…':'');

      // Capa preview
      const capaPreview = document.getElementById('derivar-res-capa');
      if (dados.capaUrl) { capaPreview.src=dados.capaUrl; capaPreview.style.display=''; } else capaPreview.style.display='none';

      btn.textContent = '✓ Confirmar e salvar';
      btn.disabled = false;

    } catch(err) {
      document.getElementById('derivar-progresso').style.display = 'none';
      mostrarToast('Erro: '+err.message);
      btn.disabled = false;
    }
    return;
  }

  // FASE 2: Salvar com o título correto
  btn.disabled = true;
  const dados = JSON.parse(btn.dataset.dadosJson);
  // Resetar para próxima vez
  btn.dataset.fase = '';
  btn.dataset.dadosJson = '';
  btn.textContent = 'Buscar';

  const tituloFinal = dados.tituloOficial;
  const obraIdExistente = window._derivarParaObraId;
  // ID baseado no título oficial corrigido
  const obraId = obraIdExistente || tituloFinal.toLowerCase().replace(/[^a-z0-9]/g,'_');
  window._derivarParaObraId = null;

  let obra = await DB.buscarObra(obraId);
  // Se era obra existente com ID diferente, migrar
  if (!obra && obraIdExistente) obra = await DB.buscarObra(obraIdExistente);
  if (!obra) obra = { id:obraId, titulo:tituloFinal, capitulos:[], capaUrl:null, descricao:'' };

  // Atualizar com dados completos
  obra.titulo          = tituloFinal;
  obra.tituloOriginal  = dados.tituloOriginal || '';
  obra.descricao       = dados.descricao || obra.descricao || '';
  obra.nota            = dados.nota || obra.nota || null;
  obra.ano             = dados.ano || obra.ano || null;
  obra.status          = dados.status || obra.status || null;
  obra.tags            = dados.tags?.length ? dados.tags : (obra.tags || []);

  // Capa via canvas (evita CORS em sessões futuras)
  if (dados.capaUrl) {
    try {
      const img = new Image(); img.crossOrigin='anonymous';
      await new Promise((res,rej) => { img.onload=res; img.onerror=rej; img.src=dados.capaUrl+'?nc='+Date.now(); });
      const cv=document.createElement('canvas'); cv.width=160; cv.height=220;
      const ctx=cv.getContext('2d'); const r=Math.max(160/img.width,220/img.height);
      ctx.drawImage(img,(160-img.width*r)/2,(220-img.height*r)/2,img.width*r,img.height*r);
      obra.capaUrl = cv.toDataURL('image/jpeg',0.82);
    } catch { obra.capaUrl = dados.capaUrl; }
  }

  await DB.salvarObra(obra);
  document.getElementById('modal-derivar').style.display = 'none';
  await Biblioteca.renderizarBiblioteca();
  mostrarToast(`"${tituloFinal}" salvo com sucesso! ✓`);
  btn.disabled = false;
  if (obraIdExistente) setTimeout(() => Biblioteca.abrirModalObra(obraId), 400);
}

// ── Armazenamento ──
async function mostrarArmazenamento() {
  const obras = await DB.buscarTodasObras();
  const totalCaps = obras.reduce((s,o) => s+o.capitulos.length, 0);
  let usado = '?';
  try { const est=await navigator.storage.estimate(); usado=`${(est.usage/1024/1024).toFixed(1)} MB`; } catch {}
  document.getElementById('armazenamento-info').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px"><span>Obras</span><strong>${obras.length}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px"><span>Capítulos</span><strong>${totalCaps}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px"><span>Espaço usado</span><strong>${usado}</strong></div>
    </div>`;
  document.getElementById('modal-armazenamento').style.display='flex';
}

// ── Migração via arquivo JSON baixável ──
async function executarMigracaoAcesso() {
  mostrarToast('Preparando exportação…', 60000);
  try {
    const obras = await DB.buscarTodasObras();
    const pacote = { v:2, tipo:'acesso', obras:[] };
    for (const obra of obras) {
      const capsData = [];
      for (const cap of obra.capitulos) {
        const blobs = await DB.buscarPaginasCap(cap.id);
        const paginasB64 = await Promise.all(blobs.map(b => new Promise(res => { const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); })));
        capsData.push({ numero:cap.numero, paginas:paginasB64 });
      }
      pacote.obras.push({ id:obra.id, titulo:obra.titulo, tituloOriginal:obra.tituloOriginal||'', descricao:obra.descricao||'', capaUrl:obra.capaUrl||'', nota:obra.nota||null, ano:obra.ano||null, status:obra.status||null, tags:obra.tags||[], capitulos:capsData });
    }
    // Baixar como arquivo JSON
    const json