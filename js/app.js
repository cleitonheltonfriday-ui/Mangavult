document.addEventListener("DOMContentLoaded", () => {

alert("JavaScript carregado!");

    const biblioteca = document.querySelector(".biblioteca");
    const botaoImportar = document.querySelector(".importar");

    const formulario = document.getElementById("formulario");

    const nomeObra = document.getElementById("nomeObra");
    const capitulo = document.getElementById("capitulo");

    const salvarCapitulo =
        document.getElementById("salvarCapitulo");

    let obras =
        JSON.parse(localStorage.getItem("mangavult"))
        || [];

    renderizarBiblioteca();

    botaoImportar.addEventListener("click", () => {

        if(formulario.style.display === "none"){

            formulario.style.display = "block";

        }else{

            formulario.style.display = "none";

        }

    });

    salvarCapitulo.addEventListener("click", () => {

        const nome = nomeObra.value.trim();

        const cap = capitulo.value.trim();

        if(!nome || !cap){

            alert("Preencha todos os campos.");

            return;

        }

        let obraExistente =
            obras.find(o => o.nome === nome);

        if(!obraExistente){

            obraExistente = {

                nome: nome,
                capitulos: []

            };

            obras.push(obraExistente);

        }

        obraExistente.capitulos.push(cap);

        localStorage.setItem(
            "mangavult",
            JSON.stringify(obras)
        );

        nomeObra.value = "";
        capitulo.value = "";

        formulario.style.display = "none";

        renderizarBiblioteca();

    });

    function renderizarBiblioteca(){

        biblioteca.innerHTML = "";

        obras.forEach(obra => {

            biblioteca.innerHTML += `

                <div class="card">

                    <div class="capa"></div>

                    <div class="info">

                        <h2>${obra.nome}</h2>

                        <p>
                            ${obra.capitulos.length}
                            capítulos
                        </p>

                        <p>
                            Último capítulo:
                            ${obra.capitulos[
                                obra.capitulos.length - 1
                            ]}
                        </p>

                    </div>

                </div>

            `;

        });

    }

});