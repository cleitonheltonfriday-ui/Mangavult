document.addEventListener("DOMContentLoaded", () => {

    const biblioteca = document.querySelector(".biblioteca");

    biblioteca.innerHTML = `
        <div class="card">
            <div class="capa"></div>

            <div class="info">
                <h2>Mangavult funcionando</h2>
                <p>Biblioteca carregada pelo JavaScript</p>
            </div>
        </div>
    `;

});