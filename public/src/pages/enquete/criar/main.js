

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('form-criar-enquete');
    const opcoesContainer = document.getElementById('opcoes-container');
    const btnAddOpcao = document.getElementById('btn-add-opcao');
    const btnRemoveOpcao = document.getElementById('btn-remove-opcao'); // Novo botão
    const errorMessage = document.getElementById('error-message');

    function AtualizarEstadoBotaoRemover() {
        const inputCount = opcoesContainer.querySelectorAll('.opcao-input').length;
        btnRemoveOpcao.disabled = inputCount <= 3;
    }

    // Evento para adicionar opção
    btnAddOpcao.addEventListener('click', () => {
        const inputCount = opcoesContainer.querySelectorAll('.opcao-input').length;
        const novoInput = document.createElement('input');
        novoInput.type = 'text';
        novoInput.name = 'opcao';
        novoInput.classList.add('opcao-input');
        novoInput.placeholder = `Opção ${inputCount + 1}`;
        novoInput.required = true;
        opcoesContainer.appendChild(novoInput);
        AtualizarEstadoBotaoRemover(); // Atualiza o estado do botão
    });

    btnRemoveOpcao.addEventListener('click', () => {
        const inputs = opcoesContainer.querySelectorAll('.opcao-input');
        if (inputs.length > 3) {
            inputs[inputs.length - 1].remove();
            AtualizarEstadoBotaoRemover(); // Atualiza o estado do botão
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
            errorMessage.textContent = 'Por favor, forneça pelo menos duas opções válidas.';
            return;
        }

        const dadosEnquete = {
            titulo,
            descricao,
            data_inicio,
            data_termino,
            ativo:true,
            opcoes
        };

        try {

            const response = await fetch('/api/enquetes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosEnquete),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha ao criar a enquete.');
            }

            window.location.href = '/';

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });

    AtualizarEstadoBotaoRemover();
});