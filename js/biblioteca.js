// ═══════════════════════════════════════════════
//  biblioteca.js — Renderiza a tela de biblioteca
// ═══════════════════════════════════════════════

let obraAtualModal = null;

async function renderizarBiblioteca() {
  const lista = document.getElementById('biblioteca-lista');
  const vazia = document.getElementById('biblioteca-vazia');
  const obras = await DB.buscarTodasObras();

  // Limpar cards (manter elemento vazio)
  [...lista.querySelectorAll('.obra-card')].forEach(c => c.remove());

  if (!obras.length) {
    vazia.style.display = 'flex';
    return;
  }
  vazia.style.display = 'none';

  // Ordenar por título
  obras.sort((a, b) => a.titulo.localeCompare(b.titulo));

  obras.forEach(obra => {
    const card = document.createElement('div');
    card.className = 'obra-card';
    card.dataset.obraId = obra.id;

    const ultimoCap = obra.capitulos[obra.capitulos.length - 1];

    // Capa
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

  const capaEl = document.getElementById('obra-capa-modal');
  if (obra.capaUrl) {
    capaEl.src = obra.capaUrl;
    capaEl.style.display = '';
  } else {
    capaEl.style.display = 'none';
  }

  // Lista de capítulos (do maior para o menor)
  const listaEl = document.getElementById('capitulos-lista-modal');
  listaEl.innerHTML = '';
  const caps = [...obra.capitulos].sort((a, b) => parseFloat(b.numero) - parseFloat(a.numero));
  caps.forEach(cap => {
    const item = document.createElement('div');
    item.className = 'cap-item';
    item.innerHTML = `
      <span class="cap-item-nome">Cap. ${cap.numero}</span>
      <button class="cap-item-del" data-cap-id="${cap.id}" title="Excluir">🗑</button>
    `;
    item.querySelector('.cap-item-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Excluir capítulo ${cap.numero}?`)) return;
      await deletarCapitulo(obra, cap.id);
    });
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
  // Se sobrou ao menos 1, recalcular capa
  if (obra.capitulos.length === 0) {
    obra.capaUrl = null;
  }
  await DB.salvarObra(obra);
  fecharModalObra();
  await renderizarBiblioteca();
  mostrarToast('Capítulo excluído');
}

function fecharModalObra() {
  document.getElementById('modal-obra').style.display = 'none';
  obraAtualModal = null;
}

// Botões do modal obra
document.getElementById('btn-fechar-obra').addEventListener('click', fecharModalObra);

document.getElementById('btn-continuar-leitura').addEventListener('click', async () => {
  if (!obraAtualModal) return;
  const obra = obraAtualModal;
  // Último capítulo lido ou o mais recente
  const capId = obra.ultimoCapId ?? obra.capitulos[obra.capitulos.length - 1]?.id;
  if (!capId) return;
  fecharModalObra();
  window.Leitor.abrirCapitulo(obra.id, capId);
});

document.getElementById('btn-add-proximo').addEventListener('click', () => {
  if (!obraAtualModal) return;
  const obra = obraAtualModal;
  fecharModalObra();
  // Pré-preencher formulário com próximo número
  const ultimoNum = Math.max(...obra.capitulos.map(c => parseFloat(c.numero) || 0));
  window._importPreset = {
    nomeObra: obra.titulo,
    capitulo: isFinite(ultimoNum) ? String(ultimoNum + 1) : ''
  };
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

// Fechar ao clicar fora
document.getElementById('modal-obra').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-obra')) fecharModalObra();
});

window.Biblioteca = { renderizarBiblioteca, abrirModalObra };
