// ═══════════════════════════════════════════════
//  app.js — Orquestrador principal
// ═══════════════════════════════════════════════

// ─── Utilitários globais ───
function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => {
    t.classList.toggle('ativa', t.id === id);
  });
}

function mostrarToast(msg, dur = 2000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visivel');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visivel'), dur);
}

// ─── Estado do fluxo de importação ───
let arquivoPendente = null;
let tipoPendente = null;   // 'zip' | 'imgs' | 'pdf'
window._importPreset = null;

// ─── Modal importar ───
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

// Inputs de arquivo
document.getElementById('input-zip').addEventListener('change', e => {
  if (!e.target.files[0]) return;
  arquivoPendente = e.target.files[0];
  tipoPendente = 'zip';
  e.target.value = '';
  document.getElementById('modal-importar').style.display = 'none';
  abrirFormulario();
});

document.getElementById('input-imgs').addEventListener('change', e => {
  if (!e.target.files.length) return;
  arquivoPendente = Array.from(e.target.files);
  tipoPendente = 'imgs';
  e.target.value = '';
  document.getElementById('modal-importar').style.display = 'none';
  abrirFormulario();
});

document.getElementById('input-pdf').addEventListener('change', e => {
  if (!e.target.files[0]) return;
  arquivoPendente = e.target.files[0];
  tipoPendente = 'pdf';
  e.target.value = '';
  document.getElementById('modal-importar').style.display = 'none';
  abrirFormulario();
});

// ─── Formulário de nome/capítulo ───
function abrirFormulario() {
  const preset = window._importPreset;
  document.getElementById('input-nome-obra').value = preset?.nomeObra ?? '';
  document.getElementById('input-capitulo').value = preset?.capitulo ?? '';
  document.getElementById('progresso-import').style.display = 'none';
  document.getElementById('btn-form-salvar').disabled = false;
  document.getElementById('modal-formulario').style.display = 'flex';
  document.getElementById('input-nome-obra').focus();
}

document.getElementById('btn-form-cancelar').addEventListener('click', () => {
  document.getElementById('modal-formulario').style.display = 'none';
  arquivoPendente = null;
  tipoPendente = null;
});

document.getElementById('modal-formulario').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-formulario')) {
    document.getElementById('modal-formulario').style.display = 'none';
  }
});

document.getElementById('btn-form-salvar').addEventListener('click', async () => {
  const nomeObra = document.getElementById('input-nome-obra').value.trim();
  const numCap = document.getElementById('input-capitulo').value.trim();

  if (!nomeObra) { alert('Informe o nome da obra.'); return; }
  if (!numCap) { alert('Informe o número do capítulo.'); return; }
  if (!arquivoPendente) { alert('Nenhum arquivo selecionado.'); return; }

  document.getElementById('btn-form-salvar').disabled = true;
  const progEl = document.getElementById('progresso-import');
  const fillEl = document.getElementById('progresso-fill');
  const textoEl = document.getElementById('progresso-texto');
  progEl.style.display = 'block';

  const onProgress = (pct, msg) => {
    fillEl.style.width = pct + '%';
    textoEl.textContent = msg;
  };

  try {
    let blobs = [];

    if (tipoPendente === 'zip') {
      blobs = await Importar.extrairZip(arquivoPendente, onProgress);
    } else if (tipoPendente === 'imgs') {
      onProgress(50, 'Carregando imagens…');
      blobs = arquivoPendente; // já são File objects (Blob)
      onProgress(100, 'Concluído');
    } else if (tipoPendente === 'pdf') {
      blobs = await Importar.extrairPDF(arquivoPendente, onProgress);
    }

    if (!blobs.length) throw new Error('Nenhuma imagem encontrada.');

    onProgress(100, 'Salvando…');

    // Gerar IDs
    const capId = `cap_${Date.now()}`;
    const obraId = nomeObra.toLowerCase().replace(/\s+/g, '_');

    // Salvar páginas
    await DB.salvarPaginasCap(capId, blobs);

    // Carregar ou criar obra
    let obra = await DB.buscarObra(obraId);
    if (!obra) {
      obra = { id: obraId, titulo: nomeObra, capitulos: [], capaUrl: null };
    }

    // Gerar capa da primeira página se não existe
    if (!obra.capaUrl && blobs.length) {
      obra.capaUrl = await gerarCapa(blobs[0]);
    }

    // Evitar duplicata de capítulo
    if (!obra.capitulos.find(c => c.numero === numCap)) {
      obra.capitulos.push({ id: capId, numero: numCap });
      obra.capitulos.sort((a, b) => parseFloat(a.numero) - parseFloat(b.numero));
    }

    await DB.salvarObra(obra);

    document.getElementById('modal-formulario').style.display = 'none';
    arquivoPendente = null;
    tipoPendente = null;

    await Biblioteca.renderizarBiblioteca();
    mostrarToast(`Cap. ${numCap} importado! ✓`);

    // Perguntar ação pós-importação
    setTimeout(() => perguntarAcaoPosImport(obra, { id: capId, numero: numCap }), 300);

  } catch (err) {
    console.error(err);
    alert('Erro ao importar: ' + err.message);
    document.getElementById('btn-form-salvar').disabled = false;
    progEl.style.display = 'none';
  }
});

// ─── Pós-importação ───
function perguntarAcaoPosImport(obra, cap) {
  // Overlay simples com 3 botões
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';

  const proximoNum = parseFloat(cap.numero) + 1;

  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <h2 class="modal-titulo">Capítulo ${cap.numero} importado!</h2>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn-primario" id="ppi-ler">▶ Ler agora</button>
        <button class="btn-secundario" id="ppi-proximo">+ Adicionar capítulo ${proximoNum}</button>
        <button class="btn-cancelar" id="ppi-biblioteca">Voltar para biblioteca</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#ppi-ler').addEventListener('click', () => {
    overlay.remove();
    Leitor.abrirCapitulo(obra.id, cap.id);
  });

  overlay.querySelector('#ppi-proximo').addEventListener('click', () => {
    overlay.remove();
    window._importPreset = { nomeObra: obra.titulo, capitulo: String(proximoNum) };
    document.getElementById('modal-importar').style.display = 'flex';
  });

  overlay.querySelector('#ppi-biblioteca').addEventListener('click', () => {
    overlay.remove();
  });
}

// ─── Gerar capa (primeira imagem em miniatura) ───
async function gerarCapa(blob) {
  return new Promise(res => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const W = 160, H = 220;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      // Cover fit
      const ratio = Math.max(W / img.width, H / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      URL.revokeObjectURL(url);
      res(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  });
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', async () => {
  await Biblioteca.renderizarBiblioteca();
  mostrarTela('tela-biblioteca');
});
