(function () {
    const TELEGRAM_URL = 'https://t.me/share/url?url=https%3A%2F%2Ftor.com.br&text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20a%20TOR%20Tecnologia%20sobre%20equipamentos%20de%20telecom.';
    const PHONE_DISPLAY = '0800 000 5978';
    const PHONE_TEL = 'tel:08000005978';

    const answers = [
        {
            keywords: ['sfp', 'transceiver', 'qsfp', 'modulo', 'módulo', 'optico', 'óptico'],
            text: 'Você pode filtrar o catálogo por SFP, QSFP ou Transceivers. Ao clicar em um item, a ficha mostra especificações e o link do datasheet.'
        },
        {
            keywords: ['orcamento', 'orçamento', 'cotacao', 'cotação', 'preco', 'preço', 'comprar'],
            text: `Para orçamento, informe o modelo desejado e a quantidade. Você também pode ligar para ${PHONE_DISPLAY} ou usar o formulário de suporte.`
        },
        {
            keywords: ['edital', 'licitacao', 'licitação', 'governo', 'pregao', 'pregão'],
            text: 'A TOR apoia análise de editais e documentação técnica. Envie o número do edital, lista de materiais e prazo de resposta pelo formulário de suporte.'
        },
        {
            keywords: ['garantia', 'rma', 'qualidade'],
            text: 'A política atual trabalha com garantia mínima de 12 meses e apoio para RMA conforme projeto, produto e exigência do edital.'
        },
        {
            keywords: ['telefone', '0800', 'contato', 'whatsapp', 'telegram'],
            text: `O telefone da TOR é ${PHONE_DISPLAY}. Para Telegram, use o botão “Telegram” no widget para iniciar uma conversa.`
        }
    ];

    const getAnswer = (message) => {
        const normalized = message.toLowerCase();
        const match = answers.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)));
        if (match) return match.text;
        return 'Posso ajudar com catálogo, datasheets, orçamento, edital, garantia e contato. Se preferir atendimento humano, fale pelo Telegram ou ligue para 0800 000 5978.';
    };

    const widget = document.createElement('div');
    widget.className = 'chat-widget';
    widget.innerHTML = `
        <button class="chat-toggle" type="button" aria-label="Abrir assistente TOR">Chat</button>
        <div class="chat-panel" hidden>
            <div class="chat-header">
                <div>
                    <strong>Assistente TOR</strong>
                    <span>Catálogo, datasheets e orçamento</span>
                </div>
                <button type="button" class="chat-close" aria-label="Fechar assistente">×</button>
            </div>
            <div class="chat-messages" aria-live="polite">
                <div class="chat-message bot">Olá! Posso ajudar você a encontrar produtos, entender datasheets ou solicitar orçamento.</div>
            </div>
            <form class="chat-form">
                <input type="text" placeholder="Digite sua dúvida..." aria-label="Mensagem para o assistente">
                <button type="submit">Enviar</button>
            </form>
            <div class="chat-actions">
                <a href="${TELEGRAM_URL}" target="_blank" rel="noopener">Telegram</a>
                <a href="${PHONE_TEL}">${PHONE_DISPLAY}</a>
            </div>
        </div>
    `;

    document.body.appendChild(widget);

    const toggle = widget.querySelector('.chat-toggle');
    const panel = widget.querySelector('.chat-panel');
    const close = widget.querySelector('.chat-close');
    const form = widget.querySelector('.chat-form');
    const input = widget.querySelector('input');
    const messages = widget.querySelector('.chat-messages');

    const setOpen = (open) => {
        panel.hidden = !open;
        if (open) input.focus();
    };

    const addMessage = (text, type) => {
        const message = document.createElement('div');
        message.className = `chat-message ${type}`;
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    };

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) return;
        addMessage(value, 'user');
        input.value = '';
        window.setTimeout(() => addMessage(getAnswer(value), 'bot'), 250);
    });
})();
