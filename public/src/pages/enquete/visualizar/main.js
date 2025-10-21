
const tituloEl = document.querySelector('.title-enquete');
const descricaoEl = document.querySelector('.description-enquete');
const opcoesContainer = document.getElementById('opcoes-container');
const frame = document.querySelector('.frame');

let enqueteAtual = null;
let socket = null;

function AtualizarStatusUI() {
    if (!enqueteAtual) return;

    const agora = new Date();
    const inicio = new Date(enqueteAtual.enquete.data_inicio);
    const termino = new Date(enqueteAtual.enquete.data_termino);
    const enqueteAberta = agora >= inicio && agora <= termino;

    let statusMensagem = '';
    let statusClasse = '';

    if (enqueteAberta) {
        statusMensagem = 'Votação aberta!';
        statusClasse = 'status-aberta';
    } else if (agora < inicio) {
        statusMensagem = `A votação começa em: ${inicio.toLocaleDateString('pt-BR')} às ${inicio.toLocaleTimeString('pt-BR')}`;
        statusClasse = 'status-pendente';
    } else {
        statusMensagem = `A votação terminou em: ${termino.toLocaleDateString('pt-BR')} às ${termino.toLocaleTimeString('pt-BR')}`;
        statusClasse = 'status-fechada';
    }

    const statusAntigo = frame.querySelector('.status-enquete');
    if (statusAntigo) statusAntigo.remove();
    
    const statusEl = document.createElement('p');
    statusEl.textContent = statusMensagem;
    statusEl.className = `status-enquete ${statusClasse}`;
    descricaoEl.insertAdjacentElement('afterend', statusEl);

    const botoes = opcoesContainer.querySelectorAll('.btn-opcao');
    botoes.forEach(botao => {
        botao.disabled = !enqueteAberta;
        const opcaoId = botao.dataset.opcaoId;
        const opcaoCorrespondente = enqueteAtual.opcoes.find(o => o.id == opcaoId);
        if (opcaoCorrespondente) {
             botao.textContent = `${opcaoCorrespondente.texto} (${opcaoCorrespondente.num_vote || 0} votos)`;
        }
    });
}


function ConectarWebSocket(enqueteId) {
    
    socket = new WebSocket(`ws://${window.location.host}`);

    socket.onopen = () => {
        console.log('WebSocket conectado!');
        socket.send(JSON.stringify({ type: 'subscribe', enqueteId: enqueteId }));
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'update') {
            // console.log('Atualização recebida!', message.data);
            enqueteAtual = message.data; 
            AtualizarStatusUI();
        }
    };

    socket.onclose = () => {
        console.log('WebSocket desconectado.');
    };

    socket.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
    };
}


async function CarregarEnqueteInicial() {
    const urlPath = window.location.pathname;
    const pathParts = urlPath.split('/');
    const enqueteId = pathParts[pathParts.length - 1];

    if (!enqueteId) {
        document.body.innerHTML = '<h1>Erro: ID da enquete não fornecido na URL.</h1>';
        return;
    }

    try {
        const response = await fetch(`/api/enquetes/${enqueteId}`);
        if (!response.ok) throw new Error('Enquete não encontrada.');
        
        enqueteAtual = await response.json();

        tituloEl.textContent = enqueteAtual.enquete.titulo;
        descricaoEl.textContent = enqueteAtual.enquete.descricao || 'Esta enquete não tem uma descrição.';
        opcoesContainer.innerHTML = '';

        enqueteAtual.opcoes.forEach(opcao => {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.classList.add('btn-opcao');
            botao.dataset.opcaoId = opcao.id;
            botao.addEventListener('click', () => Votar(opcao.id));
            opcoesContainer.appendChild(botao);
        });

        AtualizarStatusUI();

        setInterval(AtualizarStatusUI, 1000);

        ConectarWebSocket(enqueteId);

    } catch (error) {
        frame.innerHTML = `<h1>Erro ao carregar enquete: ${error.message}</h1>`;
    }
}


async function Votar(opcaoId) {
    try {
        const response = await fetch(`/api/opcoes/${opcaoId}/votar`, { method: 'POST' });
        if (response.status === 409) {
            const errorData = await response.json();
            alert(errorData.error);
            return;
        }
        if (!response.ok) throw new Error('Não foi possível registrar o voto.');

        // const updatedResponse = await fetch(`/api/enquetes/${enqueteAtual.enquete.id}`);
        // enqueteAtual = await updatedResponse.json();

        AtualizarStatusUI();
        
    } catch (error) {
        alert(error.message);
    }
}


document.addEventListener('DOMContentLoaded', CarregarEnqueteInicial);