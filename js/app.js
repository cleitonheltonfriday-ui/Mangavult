document.addEventListener("DOMContentLoaded", () => {

    const biblioteca = document.querySelector(".biblioteca");

    const obras = [
        {
            nome: "One Punch Man",
            capitulos: 127,
            ultimaLeitura: 127
        },
        {
            nome: "Berserk",
            capitulos: 381,
            ultimaLeitura: 381
        }
    ];

    biblioteca.innerHTML = "";

    obras.forEach(obra => {

        biblioteca.innerHTML += `
            <div class="card">

                <div class="capa"></div>

                <div class="info">
                    <h2>${obra.nome}</h2>
                    <p>${obra.capitulos} capítulos</p>
                    <p>Última leitura: Cap. ${obra.ultimaLeitura}</p>
                </div>

            </div>
        `;

    });

});