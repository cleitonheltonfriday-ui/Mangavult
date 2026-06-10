// ═══════════════════════════════════════════════
//  db.js — IndexedDB para armazenar obras + capítulos (imagens em blob)
// ═══════════════════════════════════════════════
const DB_NAME = 'mangavult';
const DB_VERSION = 2;
let db;

function abrirDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('obras')) {
        d.createObjectStore('obras', { keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('paginas')) {
        const s = d.createObjectStore('paginas', { keyPath: 'id' });
        s.createIndex('capId', 'capId');
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

async function salvarObra(obra) {
  const d = await abrirDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('obras', 'readwrite');
    tx.objectStore('obras').put(obra);
    tx.oncomplete = res;
    tx.onerror = e => rej(e.target.error);
  });
}

async function buscarTodasObras() {
  const d = await abrirDB();
  return new Promise((res, rej) => {
    const req = d.transaction('obras').objectStore('obras').getAll();
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e.target.error);
  });
}

async function buscarObra(id) {
  const d = await abrirDB();
  return new Promise((res, rej) => {
    const req = d.transaction('obras').objectStore('obras').get(id);
    req.onsuccess = e => res(e.target.result);
    req.onerror = e => rej(e.target.error);
  });
}

async function deletarObra(obraId, obra) {
  const d = await abrirDB();
  // Deletar todas as páginas de todos os capítulos
  for (const cap of obra.capitulos) {
    await deletarPaginasCap(cap.id);
  }
  return new Promise((res, rej) => {
    const tx = d.transaction('obras', 'readwrite');
    tx.objectStore('obras').delete(obraId);
    tx.oncomplete = res;
    tx.onerror = e => rej(e.target.error);
  });
}

async function salvarPaginasCap(capId, blobs) {
  const d = await abrirDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('paginas', 'readwrite');
    const store = tx.objectStore('paginas');
    blobs.forEach((blob, i) => {
      store.put({ id: `${capId}_${i}`, capId, ordem: i, blob });
    });
    tx.oncomplete = res;
    tx.onerror = e => rej(e.target.error);
  });
}

async function buscarPaginasCap(capId) {
  const d = await abrirDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('paginas');
    const idx = tx.objectStore('paginas').index('capId');
    const req = idx.getAll(capId);
    req.onsuccess = e => {
      const r = e.target.result.sort((a,b) => a.ordem - b.ordem);
      res(r.map(p => p.blob));
    };
    req.onerror = e => rej(e.target.error);
  });
}

async function deletarPaginasCap(capId) {
  const d = await abrirDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('paginas', 'readwrite');
    const idx = tx.objectStore('paginas').index('capId');
    const req = idx.getAllKeys(capId);
    req.onsuccess = e => {
      const store = tx.objectStore('paginas');
      e.target.result.forEach(k => store.delete(k));
      tx.oncomplete = res;
    };
    req.onerror = e => rej(e.target.error);
  });
}

window.DB = { salvarObra, buscarTodasObras, buscarObra, deletarObra, salvarPaginasCap, buscarPaginasCap, deletarPaginasCap };
