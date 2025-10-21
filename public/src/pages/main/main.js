const body = document.querySelector("body");

async function DisplayEnquetes() {
    const container = document.getElementById("container-enquetes-id");

    try {
        const response = await fetch('/api/enquetes');
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const enquetes = await response.json();
        container.innerHTML = '';

        if (enquetes.length === 0) {
            container.textContent = 'Nenhuma enquete encontrada.';
            return;
        }

        enquetes.forEach(enquete => {

            const agora = new Date();
            const inicio = new Date(enquete.data_inicio);
            const termino = new Date(enquete.data_termino);
            
            let statusClasse = '';
            if (agora < inicio) {
                statusClasse = 'status-pendente'; 
            } else if (agora > termino) {
                statusClasse = 'status-fechada'; 
            } else {
                statusClasse = 'status-aberta';
            }

            const link = document.createElement('a');
            link.href = `/enquete/${enquete.id}`; // Corrigido para a rota de visualização
            link.classList.add('link-sem-estilo');

            const card = document.createElement('div');
            // Adiciona a classe de status ao card
            card.classList.add('card-enquete', statusClasse);
            
            // Atualiza o HTML para mostrar as duas datas
            card.innerHTML = `
                <h2>${enquete.titulo}</h2>
                <p>${enquete.descricao || 'Sem descrição.'}</p>
                <div class="card-datas">
                    <span>Início: ${inicio.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Término: ${termino.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `;

            link.appendChild(card);
            container.append(link);
        });

    } catch (error) {
        console.error('Falha ao mostrar enquetes:', error);
        container.textContent = 'Falha ao carregar as enquetes. Tente novamente mais tarde.';
    }
}

document.addEventListener('DOMContentLoaded', DisplayEnquetes);