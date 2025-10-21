

let idsParaDeletar = [];


document.addEventListener('DOMContentLoaded', async () => {

    const form = document.getElementById('form-criar-enquete');
    const tituloInput = document.getElementById('titulo');
    const descricaoInput = document.getElementById('descricao');
    const dataInicioInput = document.getElementById('data_inicio');
    const dataTerminoInput = document.getElementById('data_termino');
    const opcoesContainer = document.getElementById('opcoes-container');
    const btnAddOpcao = document.getElementById('btn-add-opcao');
    const btnRemoveOpcao = document.getElementById('btn-remove-opcao');
    const errorMessage = document.getElementById('error-message');
    
    const urlPath = window.location.pathname;
    const pathParts = urlPath.split('/');
    const enqueteId = pathParts[pathParts.length - 1];

    if (!enqueteId) {
        document.body.innerHTML = '<h1>Erro: ID da enquete não fornecido.</h1>';
        return;
    }

    try {
        const response = await fetch(`/api/enquetes/${enqueteId}`);
        if (!response.ok) throw new Error('Não foi possível carregar os dados da enquete.');
        
        const { enquete, opcoes } = await response.json();

        tituloInput.value = enquete.titulo;
        descricaoInput.value = enquete.descricao || '';
        dataInicioInput.value = enquete.data_inicio.slice(0, 16);
        dataTerminoInput.value = enquete.data_termino.slice(0, 16);

        opcoesContainer.innerHTML = '';
        opcoes.forEach(opcao => {
            const input = document.createElement('input');
            input.type = 'text';
            input.name = 'opcao';
            input.classList.add('opcao-input');
            input.value = opcao.texto;
            input.required = true;
            input.dataset.optionId = opcao.id;
            opcoesContainer.appendChild(input);
        });
        AtualizarEstadoBotaoRemover();

    } catch (error) {
        errorMessage.textContent = error.message;
    }


    function AtualizarEstadoBotaoRemover() {
        const inputCount = opcoesContainer.querySelectorAll('.opcao-input').length;
        btnRemoveOpcao.disabled = inputCount <= 3;
    }

    btnAddOpcao.addEventListener('click', () => {
        const inputCount = opcoesContainer.querySelectorAll('.opcao-input').length;
        const novoInput = document.createElement('input');
        novoInput.type = 'text';
        novoInput.name = 'opcao';
        novoInput.classList.add('opcao-input');
        novoInput.placeholder = `Opção ${inputCount + 1}`;
        novoInput.required = true;
        opcoesContainer.appendChild(novoInput);
        AtualizarEstadoBotaoRemover(); 
    });

    btnRemoveOpcao.addEventListener('click', () => {
        const inputs = opcoesContainer.querySelectorAll('.opcao-input');
        if (inputs.length > 3) {
            const ultimoInput = inputs[inputs.length - 1];

            if (ultimoInput.dataset.optionId) {
                idsParaDeletar.push(parseInt(ultimoInput.dataset.optionId, 10));
            }
            ultimoInput.remove();
            AtualizarEstadoBotaoRemover();
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const titulo = document.getElementById('titulo').value;
        const descricao = document.getElementById('descricao').value;
        const data_inicio = document.getElementById('data_inicio').value;
        const data_termino = document.getElementById('data_termino').value;
        const inputsOpcoes = document.querySelectorAll('.opcao-input');
        
        const opcoes = Array.from(inputsOpcoes)
                            .map(input => input.value.trim())
                            .filter(texto => texto !== '');

        if (!data_inicio || !data_termino) {
            errorMessage.textContent = 'Por favor, preencha as datas de início e término.';
            return;
        }

        if (opcoes.length < 3) {
            errorMessage.textContent = 'Por favor, forneça pelo menos três opções válidas.';
            return;
        }

        const opcoesPayload = Array.from(inputsOpcoes).map(input => ({
            id: input.dataset.optionId ? parseInt(input.dataset.optionId) : null,
            texto: input.value.trim()
        })).filter(op => op.texto);


        const dadosAtualizados = {
            titulo,
            descricao: descricao,
            data_inicio: data_inicio,
            data_termino: data_termino,
            opcoes: opcoesPayload,
            idsParaDeletar: idsParaDeletar
        };

        try {
            const response = await fetch(`/api/enquetes/${enqueteId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosAtualizados),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao atualizar a enquete.');
            }
            alert('Enquete atualizada com sucesso!');
            window.location.href = `/enquete/${enqueteId}`; 

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
});