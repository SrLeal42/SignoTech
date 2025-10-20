const body = document.querySelector("body");


async function DisplayEnquetes() {
    const container = document.getElementById("container-enquetes-id");

    try {
        const response = await fetch('api/enquetes');
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const enquetes = await response.json();
        // console.log(enquetes)
        container.innerHTML = '';

        if (enquetes.length === 0) {
            container.textContent = 'Nenhuma enquete encontrada.';
            return;
        }

        enquetes.forEach(enquete => {
            const card = document.createElement('div');
            card.classList.add('card-enquete');

            card.innerHTML = `
                <h2>${enquete.titulo}</h2>
                <p>${enquete.descricao || 'Sem descrição.'}</p>
                <small>Criada em: ${new Date(enquete.data_inicio).toLocaleDateString('pt-BR')}</small>
            `;

            container.append(card);
        });

    } catch (error) {
        console.error('Falha ao mostrar enquetes:', error);
        container.textContent = 'Falha ao carregar as enquetes. Tente novamente mais tarde.';
    }


}

document.addEventListener('DOMContentLoaded', DisplayEnquetes);