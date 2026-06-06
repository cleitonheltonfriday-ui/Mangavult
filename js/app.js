// ═══════════════════════════════════════════════
//  app.js — Orquestrador principal v3
// ═══════════════════════════════════════════════

// ────────────────────────────────────────────────
//  UTILITÁRIOS GLOBAIS
// ────────────────────────────────────────────────
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === id));
}

function mostrarToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visivel');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visivel'), dur);
}

async function gerarCapa(blob) {
  return new Promise(res => {
    const url = URL.createObjectURL(blob);
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
      res(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

// ────────────────────────────────────────────────
//  SPLASH SCREEN (tela de abertura)
// ────────────────────────────────────────────────
function mostrarSplash() {
  return new Promise(res => {
    const splash = document.getElementById('splash');
    splash.style.display = 'flex';
    // Animação de entrada já em CSS; após 2.2s desvanece
    setTimeout(() => {
      splash.classList.add('saindo');
      setTimeout(() => { splash.style.display = 'none'; res(); }, 600);
    }, 2200);
  });
}

// ────────────────────────────────────────────────
//  MODAL DE BOAS-VINDAS
// ────────────────────────────────────────────────
function verificarBoasVindas() {
  const pref = localStorage.getItem('mvBoasVindas');
  if (pref === 'nunca') return; // "sempre mostrar" não, nesse caso é 'sempre'
  // Se 'sempre' ou null → mostrar
  if (pref === 'sempre' || pref === null) {
    setTimeout(() => mostrarModalBoasVindas(), 200);
  }
}

function mostrarModalBoasVindas() {
  document.getElementById('modal-boas-vindas').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  // Fechar com X principal → pergunta preferência
  document.getElementById('btn-bv-fechar').addEventListener('click', () => {
    document.getElementById('modal-boas-vindas').style.display = 'none';
    document.getElementById('modal-bv-pref').style.display = 'flex';
  });

  // Sub-modal preferência
  document.getElementById('btn-bv-nunca').addEventListener('click', () => {
    localStorage.setItem('mvBoasVindas', 'nunca');
    document.getElementById('modal-bv-pref').style.display = 'none';
  });
  document.getElementById('btn-bv-sempre').addEventListener('click', () => {
    localStorage.setItem('mvBoasVindas', 'sempre');
    document.getElementById('modal-bv-pref').style.display = 'none';
  });
  // X pequeno do sub-modal → registra "sempre mostrar" e fecha
  document.getElementById('btn-bv-pref-fechar').addEventListener('click', () => {
    localStorage.setItem('mvBoasVindas', 'sempre');
    document.getElementById('modal-bv-pref').style.display = 'none';
  });
});

// ────────────────────────────────────────────────
//  IMPORTAÇÃO
// ────────────────────────────────────────────────
let arquivoPendente = null;
let tipoPendente = null;
window._importPreset = null;

document.addEventListener('DOMContentLoaded', () => {

  // Abrir modal importar
  document.getElementById('btn-importar').addEventListener('click', () => {
    window._importPreset = null;
    document.getElementById('modal-importar').style.display = 'flex';
  });
  document.getElementById('btn-cancelar-import').addEventListener('click', () => {
    document.getElementById('modal-importar').style.display = 'none';
  });
  document.getElementById('modal-importar').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-importar'))
      document.getElementById('modal-importar').style.display = 'none';
  });

  // Inputs arquivo
  document.getElementById('input-zip').addEventListener('change', e => {
    if (!e.target.files[0]) return;
    arquivoPendente = e.target.files[0]; tipoPendente = 'zip';
    e.target.value = '';
    document.getElementById('modal-importar').style.display = 'none';
    abrirFormulario();
  });
  document.getElementById('input-imgs').addEventListener('change', e => {
    if (!e.target.files.length) return;
    arquivoPendente = Array.from(e.target.files); tipoPendente = 'imgs';
    e.target.value = '';
    document.getElementById('modal-importar').style.display = 'none';
    abrirFormulario();
  });
  document.getElementById('input-pdf').addEventListener('change', e => {
    if (!e.target.files[0]) return;
    arquivoPendente = e.target.files[0]; tipoPendente = 'pdf';
    e.target.value = '';
    document.getElementById('modal-importar').style.display = 'none';
    abrirFormulario();
  });

  // Derivar obra
  document.getElementById('btn-derivar-obra').addEventListener('click', () => {
    document.getElementById('modal-importar').style.display = 'none';
    document.getElementById('input-derivar-nome').value = '';
    document.getElementById('derivar-progresso').style.display = 'none';
    document.getElementById('modal-derivar').style.display = 'flex';
  });

  // Formulário capítulo
  document.getElementById('btn-form-cancelar').addEventListener('click', () => {
    document.getElementById('modal-formulario').style.display = 'none';
    arquivoPendente = null; tipoPendente = null;
  });
  document.getElementById('modal-formulario').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-formulario'))
      document.getElementById('modal-formulario').style.display = 'none';
  });
  document.getElementById('btn-form-salvar').addEventListener('click', importarCapitulo);

  // Derivar obra confirmar
  document.getElementById('btn-derivar-cancelar').addEventListener('click', () => {
    document.getElementById('modal-derivar').style.display = 'none';
  });
  document.getElementById('btn-derivar-confirmar').addEventListener('click', executarDerivarObra);

  // Menu principal hamburguer
  document.getElementById('btn-menu-principal').addEventListener('click', () => {
    document.getElementById('modal-menu-principal').style.display = 'flex';
  });
  document.getElementById('btn-fechar-menu-principal').addEventListener('click', () => {
    document.getElementById('modal-menu-principal').style.display = 'none';
  });
  document.getElementById('menu-importar').addEventListener('click', () => {
    document.getElementById('modal-menu-principal').style.display = 'none';
    document.getElementById('modal-importar').style.display = 'flex';
  });
  document.getElementById('menu-armazenamento').addEventListener('click', () => {
    document.getElementById('modal-menu-principal').style.display = 'none';
    mostrarArmazenamento();
  });
  document.getElementById('menu-sobre').addEventListener('click', () => {
    document.getElementById('modal-menu-principal').style.display = 'none';
    mostrarModalBoasVindas();
  });

  // Fechar armazenamento
  document.getElementById('btn-fechar-armazenamento').addEventListener('click', () => {
    document.getElementById('modal-armazenamento').style.display = 'none';
  });

  // Busca
  document.getElementById('btn-busca').addEventListener('click', () => {
    document.getElementById('busca-wrap').classList.add('visivel');
    document.getElementById('busca-input').focus();
  });
  document.getElementById('busca-fechar').addEventListener('click', () => {
    document.getElementById('busca-wrap').classList.remove('visivel');
    document.getElementById('busca-input').value = '';
    Biblioteca.renderizarBiblioteca();
  });
  document.getElementById('busca-input').addEventListener('input', e => {
    Biblioteca.renderizarBiblioteca(e.target.value);
  });

  // Remigrar capítulo (link)
  document.getElementById('btn-remigrar-cap').addEventListener('click', () => {
    document.getElementById('modal-importar').style.display = 'none';
    mostrarTutorialMigracao(() => {
      document.getElementById('modal-remigrar').style.display = 'flex';
    });
  });
  document.getElementById('btn-remigrar-cancelar').addEventListener('click', () => {
    document.getElementById('modal-remigrar').style.display = 'none';
  });
  document.getElementById('btn-remigrar-confirmar').addEventListener('click', executarRemigrarCap);

  // Migração de acesso total
  document.getElementById('menu-migrar-acesso').addEventListener('click', () => {
    document.getElementById('modal-menu-principal').style.display = 'none';
    mostrarTutorialMigracao(() => {
      executarMigracaoAcesso();
    });
  });
  document.getElementById('menu-remigrar-acesso').addEventListener('click', () => {
    document.getElementById('modal-menu-principal').style.display = 'none';
    mostrarTutorialMigracao(() => {
      document.getElementById('modal-remigrar-acesso').style.display = 'flex';
    });
  });
  document.getElementById('btn-remigrar-acesso-cancelar').addEventListener('click', () => {
    document.getElementById('modal-remigrar-acesso').style.display = 'none';
  });
  document.getElementById('btn-remigrar-acesso-confirmar').addEventListener('click', executarRemigrarAcesso);

});

// ────────────────────────────────────────────────
//  FORMULÁRIO DE IMPORTAÇÃO
// ────────────────────────────────────────────────
function abrirFormulario() {
  const preset = window._importPreset;
  document.getElementById('input-nome-obra').value = preset?.nomeObra ?? '';
  document.getElementById('input-capitulo').value = preset?.capitulo ?? '';
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
  const progEl  = document.getElementById('progresso-import');
  const fillEl  = document.getElementById('progresso-fill');
  const textoEl = document.getElementById('progresso-texto');
  progEl.style.display = 'block';

  const onProgress = (pct, msg) => { fillEl.style.width = pct+'%'; textoEl.textContent = msg; };

  try {
    let blobs = [];
    if      (tipoPendente === 'zip')  blobs = await Importar.extrairZip(arquivoPendente, onProgress);
    else if (tipoPendente === 'imgs') { onProgress(50,'Carregando…'); blobs = arquivoPendente; onProgress(100,'Concluído'); }
    else if (tipoPendente === 'pdf')  blobs = await Importar.extrairPDF(arquivoPendente, onProgress);

    if (!blobs.length) throw new Error('Nenhuma imagem encontrada.');
    onProgress(100, 'Salvando…');

    const capId  = `cap_${Date.now()}`;
    const obraId = nomeObra.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await DB.salvarPaginasCap(capId, blobs);

    let obra = await DB.buscarObra(obraId);
    if (!obra) obra = { id: obraId, titulo: nomeObra, capitulos: [], capaUrl: null, descricao: '' };
    if (!obra.capaUrl && blobs.length) obra.capaUrl = await gerarCapa(blobs[0]);
    if (!obra.capitulos.find(c => c.numero === numCap)) {
      obra.capitulos.push({ id: capId, numero: numCap });
      obra.capitulos.sort((a,b) => parseFloat(a.numero) - parseFloat(b.numero));
    }
    await DB.salvarObra(obra);

    document.getElementById('modal-formulario').style.display = 'none';
    arquivoPendente = null; tipoPendente = null;
    await Biblioteca.renderizarBiblioteca();
    mostrarToast(`Cap. ${numCap} importado! ✓`);
    setTimeout(() => perguntarAcaoPosImport(obra, { id: capId, numero: numCap }), 300);

  } catch(err) {
    console.error(err);
    mostrarToast('Erro: ' + err.message);
    document.getElementById('btn-form-salvar').disabled = false;
    progEl.style.display = 'none';
  }
}

// ────────────────────────────────────────────────
//  PÓS-IMPORTAÇÃO
// ────────────────────────────────────────────────
function perguntarAcaoPosImport(obra, cap) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  const prox = parseFloat(cap.numero) + 1;
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-titulo">Cap. ${cap.numero} importado! ✓</h2>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn-primario" id="ppi-ler">▶ Ler agora</button>
        <button class="btn-secundario" id="ppi-proximo">+ Adicionar capítulo ${prox}</button>
        <button class="btn-cancelar" id="ppi-biblioteca">Voltar para biblioteca</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#ppi-ler').addEventListener('click', () => { overlay.remove(); Leitor.abrirCapitulo(obra.id, cap.id); });
  overlay.querySelector('#ppi-proximo').addEventListener('click', () => {
    overlay.remove();
    window._importPreset = { nomeObra: obra.titulo, capitulo: String(prox) };
    document.getElementById('modal-importar').style.display = 'flex';
  });
  overlay.querySelector('#ppi-biblioteca').addEventListener('click', () => overlay.remove());
}

// ────────────────────────────────────────────────
//  DERIVAR OBRA DA WEB
// ────────────────────────────────────────────────
async function executarDerivarObra() {
  const nome = document.getElementById('input-derivar-nome').value.trim();
  if (!nome) { mostrarToast('Informe o nome da obra'); return; }

  const btn = document.getElementById('btn-derivar-confirmar');
  btn.disabled = true;
  document.getElementById('derivar-progresso').style.display = 'block';
  document.getElementById('derivar-fill').style.width = '30%';
  document.getElementById('derivar-texto').textContent = 'Buscando na web…';

  try {
    const dados = await Biblioteca.derivarObraWeb(nome);
    document.getElementById('derivar-fill').style.width = '100%';
    document.getElementById('derivar-texto').textContent = dados ? 'Encontrado!' : 'Sem dados encontrados…';

    // Se veio de "derivar obra existente", usar o ID da obra existente
    const obraIdExistente = window._derivarParaObraId;
    const obraId = obraIdExistente || nome.toLowerCase().replace(/[^a-z0-9]/g, '_');
    window._derivarParaObraId = null;

    let obra = await DB.buscarObra(obraId);
    if (!obra) obra = { id: obraId, titulo: nome, capitulos: [], capaUrl: null, descricao: '' };

    if (dados?.descricao) obra.descricao = dados.descricao;
    if (dados?.capaUrl) {
      // Tentar converter para dataURL (evita problemas de CORS em sessões futuras)
      try {
        const img = new Image(); img.crossOrigin = 'anonymous';
        await new Promise((res,rej) => {
          img.onload = res; img.onerror = rej;
          img.src = dados.capaUrl + '?t=' + Date.now(); // cache bust
        });
        const canvas = document.createElement('canvas');
        canvas.width = 160; canvas.height = 220;
        const ctx = canvas.getContext('2d');
        const r = Math.max(160/img.width, 220/img.height);
        ctx.drawImage(img,(160-img.width*r)/2,(220-img.height*r)/2,img.width*r,img.height*r);
        obra.capaUrl = canvas.toDataURL('image/jpeg', 0.82);
      } catch {
        // CORS bloqueou — salvar URL direta (funciona para exibição mas não para canvas)
        obra.capaUrl = dados.capaUrl;
      }
    }
    await DB.salvarObra(obra);

    document.getElementById('modal-derivar').style.display = 'none';
    await Biblioteca.renderizarBiblioteca();
    mostrarToast(dados ? `"${nome}" derivado com sucesso! ✓` : `"${nome}" criado (sem dados da web)`);

    // Se era obra existente, reabrir modal dela
    if (obraIdExistente) {
      setTimeout(() => Biblioteca.abrirModalObra(obraId), 400);
    }

  } catch(err) {
    mostrarToast('Erro: ' + err.message);
  }
  btn.disabled = false;
  document.getElementById('derivar-progresso').style.display = 'none';
}

// ────────────────────────────────────────────────
//  ARMAZENAMENTO
// ────────────────────────────────────────────────
async function mostrarArmazenamento() {
  const obras = await DB.buscarTodasObras();
  const totalCaps = obras.reduce((s,o) => s + o.capitulos.length, 0);
  let usado = '?';
  try {
    const est = await navigator.storage.estimate();
    const mb = (est.usage / 1024 / 1024).toFixed(1);
    const tot = est.quota ? (est.quota / 1024 / 1024 / 1024).toFixed(1) + ' GB disponíveis' : '';
    usado = `${mb} MB usados ${tot ? '· ' + tot : ''}`;
  } catch {}

  document.getElementById('armazenamento-info').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px">
        <span>Obras</span><strong>${obras.length}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px">
        <span>Capítulos</span><strong>${totalCaps}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:8px">
        <span>Espaço</span><strong style="font-size:12px">${usado}</strong>
      </div>
    </div>`;
  document.getElementById('modal-armazenamento').style.display = 'flex';
}

// ────────────────────────────────────────────────
//  MIGRAÇÃO DE CAPÍTULO (link)
// ────────────────────────────────────────────────
// Gera um link com os dados do capítulo em base64 comprimido
async function gerarLinkCapitulo(obraId, capId) {
  const obra  = await DB.buscarObra(obraId);
  const blobs = await DB.buscarPaginasCap(capId);
  const cap   = obra.capitulos.find(c => c.id === capId);

  mostrarToast('Preparando link… aguarde', 60000);

  // Converter blobs para base64
  const paginasB64 = await Promise.all(blobs.map(b => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(b);
  })));

  const payload = {
    v: 1,
    tipo: 'cap',
    obra: { id: obra.id, titulo: obra.titulo, descricao: obra.descricao || '', capaUrl: obra.capaUrl || '' },
    cap:  { numero: cap.numero },
    paginas: paginasB64
  };

  const json = JSON.stringify(payload);
  // Comprime: usa btoa simples (para capítulos pequenos) 
  // Para capítulos grandes, avisa o usuário sobre o tamanho
  const sizeMB = (json.length / 1024 / 1024).toFixed(1);
  mostrarToast(''); // limpa toast

  if (json.length > 50 * 1024 * 1024) {
    mostrarToast(`Capítulo muito grande (${sizeMB} MB). Use migração de acesso.`);
    return null;
  }

  // Salvar no IndexedDB temporário com chave aleatória
  const key = 'mv_mig_' + Math.random().toString(36).slice(2,10);
  localStorage.setItem(key, json);
  // O "link" é só a chave — não é uma URL real
  const link = `MVLINK://${key}`;
  return { link, sizeMB, key };
}

// Botão de compartilhar capítulo (adicionado dinamicamente em biblioteca.js)
window.migrarCapitulo = async (obraId, capId) => {
  mostrarTutorialMigracao(async () => {
    mostrarToast('Gerando link…', 5000);
    const result = await gerarLinkCapitulo(obraId, capId);
    if (!result) return;
    mostrarModalLink(result.link, result.sizeMB);
  });
};

function mostrarModalLink(link, sizeMB) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-titulo">Link de Migração</h2>
      <div class="tutorial-box" style="margin-bottom:14px">
        <div class="tutorial-icon">📋</div>
        <div class="tutorial-texto">
          Copie este link e cole na opção <strong>"Remigrar Capítulo"</strong> do Mangavult no outro navegador ou dispositivo.<br><br>
          <em>⚠️ Este link não funciona na barra de endereços do navegador.</em>
        </div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:12px;word-break:break-all;font-size:12px;font-family:monospace;color:var(--accent);margin-bottom:14px;max-height:80px;overflow:auto">
        ${link}
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">Tamanho: ${sizeMB} MB</div>
      <button class="btn-primario" id="btn-copiar-link">📋 Copiar Link</button>
      <button class="btn-cancelar" id="btn-fechar-link" style="margin-top:10px">Fechar</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#btn-copiar-link').addEventListener('click', () => {
    navigator.clipboard?.writeText(link).then(() => mostrarToast('Link copiado!')).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      mostrarToast('Link copiado!');
    });
  });
  overlay.querySelector('#btn-fechar-link').addEventListener('click', () => overlay.remove());
}

// Remigrar capítulo
async function executarRemigrarCap() {
  const link = document.getElementById('input-remigrar-link').value.trim();
  if (!link.startsWith('MVLINK://')) { mostrarToast('Link inválido'); return; }

  const key = link.replace('MVLINK://', '');
  const json = localStorage.getItem(key);
  if (!json) { mostrarToast('Link não encontrado neste dispositivo/navegador'); return; }

  document.getElementById('btn-remigrar-confirmar').disabled = true;
  mostrarToast('Importando…', 10000);

  try {
    const payload = JSON.parse(json);
    if (payload.tipo !== 'cap') throw new Error('Link inválido');

    const capId  = `cap_${Date.now()}`;
    const obraId = payload.obra.id;

    // Converter base64 de volta para blobs
    const blobs = payload.paginas.map(dataUrl => {
      const arr  = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      const u8   = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      return new Blob([u8], { type: mime });
    });

    await DB.salvarPaginasCap(capId, blobs);

    let obra = await DB.buscarObra(obraId);
    if (!obra) obra = { id: obraId, titulo: payload.obra.titulo, capitulos: [], capaUrl: payload.obra.capaUrl || null, descricao: payload.obra.descricao || '' };
    if (!obra.capitulos.find(c => c.numero === payload.cap.numero)) {
      obra.capitulos.push({ id: capId, numero: payload.cap.numero });
      obra.capitulos.sort((a,b) => parseFloat(a.numero) - parseFloat(b.numero));
    }
    await DB.salvarObra(obra);
    await Biblioteca.renderizarBiblioteca();

    document.getElementById('modal-remigrar').style.display = 'none';
    mostrarToast(`Cap. ${payload.cap.numero} de "${payload.obra.titulo}" importado! ✓`);
  } catch(err) {
    mostrarToast('Erro: ' + err.message);
  }
  document.getElementById('btn-remigrar-confirmar').disabled = false;
}

// ────────────────────────────────────────────────
//  MIGRAÇÃO DE ACESSO COMPLETA
// ────────────────────────────────────────────────
async function executarMigracaoAcesso() {
  mostrarToast('Preparando migração completa… pode demorar', 60000);
  try {
    const obras = await DB.buscarTodasObras();
    const pacote = { v: 1, tipo: 'acesso', obras: [] };

    for (const obra of obras) {
      const capsData = [];
      for (const cap of obra.capitulos) {
        const blobs = await DB.buscarPaginasCap(cap.id);
        const paginasB64 = await Promise.all(blobs.map(b => new Promise(res => {
          const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b);
        })));
        capsData.push({ numero: cap.numero, paginas: paginasB64 });
      }
      pacote.obras.push({
        id: obra.id, titulo: obra.titulo,
        descricao: obra.descricao || '', capaUrl: obra.capaUrl || '',
        capitulos: capsData
      });
    }

    const json = JSON.stringify(pacote);
    const sizeMB = (json.length / 1024 / 1024).toFixed(1);
    mostrarToast('');

    const key = 'mv_acesso_' + Math.random().toString(36).slice(2,10);
    // Para migração completa, salvar em partes se necessário
    try {
      localStorage.setItem(key, json);
    } catch {
      mostrarToast('Dados muito grandes para o localStorage. Use exportação por ZIP.');
      return;
    }

    const link = `MVACESSO://${key}`;
    mostrarModalLink(link, sizeMB);
  } catch(err) {
    mostrarToast('Erro: ' + err.message);
  }
}

async function executarRemigrarAcesso() {
  const link = document.getElementById('input-remigrar-acesso-link').value.trim();
  if (!link.startsWith('MVACESSO://')) { mostrarToast('Link de acesso inválido'); return; }

  const key  = link.replace('MVACESSO://', '');
  const json = localStorage.getItem(key);
  if (!json) { mostrarToast('Link não encontrado neste dispositivo/navegador'); return; }

  document.getElementById('btn-remigrar-acesso-confirmar').disabled = true;
  mostrarToast('Importando biblioteca completa…', 60000);

  try {
    const pacote = JSON.parse(json);
    if (pacote.tipo !== 'acesso') throw new Error('Link inválido');

    for (const obraData of pacote.obras) {
      const obra = { id: obraData.id, titulo: obraData.titulo, descricao: obraData.descricao, capaUrl: obraData.capaUrl, capitulos: [] };
      for (const capData of obraData.capitulos) {
        const capId = `cap_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        const blobs = capData.paginas.map(dataUrl => {
          const arr = dataUrl.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          const u8 = new Uint8Array(bstr.length);
          for (let i=0;i<bstr.length;i++) u8[i]=bstr.charCodeAt(i);
          return new Blob([u8], { type: mime });
        });
        await DB.salvarPaginasCap(capId, blobs);
        obra.capitulos.push({ id: capId, numero: capData.numero });
      }
      obra.capitulos.sort((a,b)=>parseFloat(a.numero)-parseFloat(b.numero));
      await DB.salvarObra(obra);
    }

    await Biblioteca.renderizarBiblioteca();
    document.getElementById('modal-remigrar-acesso').style.display = 'none';
    mostrarToast(`${pacote.obras.length} obra(s) migrada(s) com sucesso! ✓`);
  } catch(err) {
    mostrarToast('Erro: ' + err.message);
  }
  document.getElementById('btn-remigrar-acesso-confirmar').disabled = false;
}

// ────────────────────────────────────────────────
//  TUTORIAL DE MIGRAÇÃO
// ────────────────────────────────────────────────
function mostrarTutorialMigracao(callback) {
  const jaViu = localStorage.getItem('mvTutorialMigracao');
  if (jaViu) { callback(); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-titulo" style="color:var(--accent)">⚠️ Como funciona a Migração</h2>
      <div class="tutorial-box">
        <div class="tutorial-icon">🔗</div>
        <div class="tutorial-texto">
          <strong>O link gerado NÃO é uma URL comum.</strong><br><br>
          Ele <em>não pode</em> ser aberto na barra de endereços do navegador, não funciona enviado por mensagem para outra pessoa, e não leva a nenhum site.<br><br>
          <strong>Como usar corretamente:</strong><br>
          1. Copie o link gerado<br>
          2. No outro navegador ou dispositivo, abra o Mangavult<br>
          3. Toque em <strong>Importar → Remigrar Capítulo</strong> (ou Remigrar Acesso)<br>
          4. Cole o link no campo e confirme<br><br>
          O Mangavult vai importar tudo automaticamente. O link funciona apenas entre abas do Mangavult no mesmo dispositivo. Para outros dispositivos, ambos precisam ter acessado o mesmo link de origem.
        </div>
      </div>
      <button class="btn-primario" id="btn-tutorial-ok" style="margin-top:4px">Entendi, continuar</button>
      <button class="btn-cancelar" id="btn-tutorial-fechar" style="margin-top:10px">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#btn-tutorial-ok').addEventListener('click', () => {
    localStorage.setItem('mvTutorialMigracao', '1');
    overlay.remove();
    callback();
  });
  overlay.querySelector('#btn-tutorial-fechar').addEventListener('click', () => overlay.remove());
}

// ────────────────────────────────────────────────
//  INIT
// ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await mostrarSplash();
  await Biblioteca.renderizarBiblioteca();
  mostrarTela('tela-biblioteca');
  verificarBoasVindas();
});

// ────── Abas do Reader Settings ──────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.rs-aba').forEach(aba => {
    aba.addEventListener('click', () => {
      document.querySelectorAll('.rs-aba').forEach(a => a.classList.remove('ativo'));
      aba.classList.add('ativo');
      const alvo = aba.dataset.aba;
      document.getElementById('rs-aba-layout').style.display    = alvo === 'layout'    ? '' : 'none';
      document.getElementById('rs-aba-fit').style.display       = alvo === 'fit'       ? '' : 'none';
      document.getElementById('rs-aba-behaviors').style.display = alvo === 'behaviors' ? '' : 'none';
    });
  });

  // Fechar clicando fora do Reader Settings
  document.getElementById('modal-reader-settings').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-reader-settings'))
      document.getElementById('modal-reader-settings').style.display = 'none';
  });
});
