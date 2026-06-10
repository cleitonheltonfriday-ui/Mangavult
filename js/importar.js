// ═══════════════════════════════════════════════
//  importar.js — Lida com ZIP, imagens e PDF
// ═══════════════════════════════════════════════

// Ordena arquivos pelo número no nome: 1.jpg, 2.jpg, 10.jpg...
function ordenarPorNome(arquivos) {
  return [...arquivos].sort((a, b) => {
    const na = parseInt(a.name.match(/\d+/)?.[0] ?? '0');
    const nb = parseInt(b.name.match(/\d+/)?.[0] ?? '0');
    return na - nb;
  });
}

// Extrai imagens de um ZIP usando JSZip carregado via CDN
async function extrairZip(file, onProgress) {
  // Carregar JSZip dinamicamente
  if (!window.JSZip) {
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }
  const zip = await JSZip.loadAsync(file);
  const entradas = [];
  zip.forEach((path, entry) => {
    if (!entry.dir && /\.(jpe?g|png|webp|gif)$/i.test(path)) {
      entradas.push({ path, entry });
    }
  });
  // Ordenar pelo nome numérico
  entradas.sort((a, b) => {
    const na = parseInt(a.path.replace(/.*\//, '').match(/\d+/)?.[0] ?? '0');
    const nb = parseInt(b.path.replace(/.*\//, '').match(/\d+/)?.[0] ?? '0');
    return na - nb;
  });
  const blobs = [];
  for (let i = 0; i < entradas.length; i++) {
    const blob = await entradas[i].entry.async('blob');
    blobs.push(blob);
    onProgress && onProgress(Math.round(((i + 1) / entradas.length) * 100), `Extraindo ${i+1}/${entradas.length}`);
  }
  return blobs;
}

// Converte PDF em lista de blobs de imagem via pdf.js
async function extrairPDF(file, onProgress) {
  if (!window.pdfjsLib) {
    await carregarScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const blobs = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    blobs.push(blob);
    onProgress && onProgress(Math.round((i / pdf.numPages) * 100), `Convertendo página ${i}/${pdf.numPages}`);
  }
  return blobs;
}

// Processa imagens selecionadas individualmente
function extrairImagens(files) {
  return ordenarPorNome(files).map(f => f);
}

function carregarScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

window.Importar = { extrairZip, extrairPDF, extrairImagens };
