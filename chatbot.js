(function () {
    const TELEGRAM_URL = 'https://t.me/share/url?url=https%3A%2F%2Ftor.com.br&text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20a%20TOR%20Tecnologia%20sobre%20equipamentos%20de%20telecom.';
    const PHONE_DISPLAY = '0800 000 5978';
    const PHONE_TEL = 'tel:08000005978';
    const CATALOG_SCRIPT = 'catalog-data.js?v=20260722-3';

    const fallbackAnswer = 'Posso ajudar a encontrar módulos SFP/QSFP, explicar o processo de compra e encaminhar você para a página do item ou formulário de cotação.';

    const widget = document.createElement('div');
    widget.className = 'chat-widget';
    widget.innerHTML = `
        <button class="chat-toggle" type="button" aria-label="Abrir assistente TOR">Chat</button>
        <div class="chat-panel" hidden>
            <div class="chat-header">
                <div>
                    <strong>Assistente TOR</strong>
                    <span>IA para catálogo, produtos e compra</span>
                </div>
                <button type="button" class="chat-close" aria-label="Fechar assistente">×</button>
            </div>
            <div class="chat-messages" aria-live="polite">
                <div class="chat-message bot">Olá! Descreva o item que você procura. Ex: SFP 10G monomodo 10 km, QSFP 100G multimodo, RJ45 cobre ou BiDi.</div>
            </div>
            <form class="chat-form">
                <input type="text" placeholder="Descreva o produto ou sua dúvida..." aria-label="Mensagem para o assistente">
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
    const submitButton = widget.querySelector('.chat-form button');

    const setOpen = (open) => {
        panel.hidden = !open;
        if (open) input.focus();
    };

    const createActions = (actions) => {
        if (!Array.isArray(actions) || actions.length === 0) return null;

        const container = document.createElement('div');
        container.className = 'chat-suggestions';
        actions.forEach((action) => {
            if (!action || !action.url || !action.label) return;
            const link = document.createElement('a');
            link.href = action.url;
            link.textContent = action.label;
            container.appendChild(link);
        });
        return container.children.length ? container : null;
    };

    const createProducts = (products) => {
        if (!Array.isArray(products) || products.length === 0) return null;

        const list = document.createElement('div');
        list.className = 'chat-products';
        products.slice(0, 3).forEach((product) => {
            const card = document.createElement('a');
            card.className = 'chat-product';
            card.href = product.detailUrl || 'produtos.html';
            const specs = product.specs || {};
            card.innerHTML = `
                <strong>${product.name}</strong>
                <span>${product.type || product.family || 'Produto TOR'}</span>
                <small>${[specs.taxa, specs.alcance, specs.conector].filter(Boolean).join(' · ')}</small>
            `;
            list.appendChild(card);
        });
        return list;
    };

    const addMessage = (text, type, payload) => {
        const message = document.createElement('div');
        message.className = `chat-message ${type}`;
        message.textContent = text;
        messages.appendChild(message);

        if (payload) {
            const products = createProducts(payload.products);
            const actions = createActions(payload.actions);
            if (products) messages.appendChild(products);
            if (actions) messages.appendChild(actions);
        }

        messages.scrollTop = messages.scrollHeight;
        return message;
    };

    const askAssistant = async (message) => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o assistente.');
        return data;
    };

    const normalize = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const loadCatalog = () => new Promise((resolve) => {
        if (Array.isArray(window.TOR_CATALOG_PRODUCTS)) {
            resolve(window.TOR_CATALOG_PRODUCTS);
            return;
        }

        const script = document.createElement('script');
        script.src = CATALOG_SCRIPT;
        script.onload = () => resolve(window.TOR_CATALOG_PRODUCTS || []);
        script.onerror = () => resolve([]);
        document.head.appendChild(script);
    });

    const productUrl = (product) => `produto-detalhe.html?produto=${encodeURIComponent(product.code || product.name)}`;
    const quoteUrl = (product) => `suporte.html?produto=${encodeURIComponent(product.name || product.code || '')}`;

    const localAssistant = async (message) => {
        const catalog = await loadCatalog();
        const terms = normalize(message).split(/[^a-z0-9,+/.-]+/).filter((term) => term.length > 1);
        const publicProducts = catalog.filter((product) => product.family === 'SFP' || product.family === 'QSFP');
        const scored = publicProducts.map((product) => {
            const text = normalize([
                product.name,
                product.code,
                product.family,
                product.type,
                product.description,
                ...Object.entries(product.specs || {}).flat()
            ].join(' '));
            const score = terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
            return { product, score };
        }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

        const products = scored.map(({ product }) => ({
            name: product.name,
            type: product.type,
            detailUrl: productUrl(product),
            specs: {
                taxa: (product.specs || {}).Taxa || '',
                alcance: (product.specs || {}).Alcance || '',
                conector: (product.specs || {}).Conector || (product.specs || {}).Interface || ''
            }
        }));

        if (!products.length) {
            return {
                reply: fallbackAnswer,
                products: [],
                actions: [{ label: 'Falar com a equipe técnica', url: 'suporte.html' }]
            };
        }

        return {
            reply: `Encontrei uma opção próxima: ${products[0].name}. Confira a página do item ou avance para a solicitação de compra.`,
            products,
            actions: [
                { label: 'Ir para página do item', url: products[0].detailUrl },
                { label: 'Fechar compra', url: quoteUrl(scored[0].product) },
                { label: 'Ver catálogo', url: 'produtos.html' }
            ]
        };
    };

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) return;

        addMessage(value, 'user');
        input.value = '';
        submitButton.disabled = true;
        const loading = addMessage('Consultando catálogo TOR...', 'bot');

        try {
            const data = await askAssistant(value);
            loading.remove();
            addMessage(data.reply || fallbackAnswer, 'bot', data);
        } catch (error) {
            loading.remove();
            const localData = await localAssistant(value);
            addMessage(localData.reply || fallbackAnswer, 'bot', localData);
        } finally {
            submitButton.disabled = false;
            input.focus();
        }
    });
})();
