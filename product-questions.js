(async function () {
    const loadProducts = async () => {
        if (Array.isArray(window.TOR_CATALOG_PRODUCTS) && window.TOR_CATALOG_PRODUCTS.length > 0) {
            return window.TOR_CATALOG_PRODUCTS;
        }

        try {
            const response = await fetch('/api/catalog');
            if (!response.ok) throw new Error('Catalog API unavailable');
            const data = await response.json();
            return data.products || [];
        } catch (error) {
            console.error('Não foi possível carregar as dúvidas do produto.', error);
            return [];
        }
    };

    const escapeHtml = (value) => String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const normalize = (value) => String(value || '').toLowerCase();
    const products = await loadProducts();
    const publicProducts = products.filter((item) => item.family === 'SFP' || item.family === 'QSFP');
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('produto') || params.get('codigo') || '';

    const product = publicProducts.find((item) => (
        normalize(item.code) === normalize(requested)
        || normalize(item.name) === normalize(requested)
    )) || publicProducts[0];

    if (!product) return;

    const specs = product.specs || {};
    const media = window.TOR_PRODUCT_MEDIA && window.TOR_PRODUCT_MEDIA[product.code];
    const detailUrl = `produto-detalhe.html?produto=${encodeURIComponent(product.code || product.name)}`;
    const supportUrl = `suporte.html?produto=${encodeURIComponent(product.name)}`;
    let activeCategory = 'todos';

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    const qaItems = [
        {
            category: 'aplicacao',
            question: 'Como confirmar se este produto atende minha aplicação?',
            answer: `Valide taxa (${specs.Taxa || 'sob consulta'}), alcance (${specs.Alcance || 'sob consulta'}), tipo de fibra (${specs.Fibra || specs.Cabo || 'sob consulta'}) e conector (${specs.Conector || specs.Interface || 'sob consulta'}) com a porta do equipamento onde o módulo será usado.`
        },
        {
            category: 'conectividade',
            question: 'Qual tipo de fibra ou cabo devo usar com este item?',
            answer: specs.Fibra
                ? `Este item está associado a ${specs.Fibra}. Confirme também o conector ${specs.Conector || specs.Interface || 'indicado no datasheet'} e a distância real do enlace.`
                : `Este item deve ser escolhido conforme o meio físico indicado no projeto e nas especificações do equipamento de destino.`
        },
        {
            category: 'comparacao',
            question: `Quando escolher ${product.family} em vez de outro formato?`,
            answer: product.family === 'QSFP'
                ? 'QSFP é indicado para enlaces de maior capacidade, como 40G ou 100G, quando a porta do equipamento suporta esse formato.'
                : 'SFP e variações como SFP+ ou SFP28 são indicados para enlaces 1G, 10G ou 25G, conforme a porta disponível no equipamento.'
        },
        {
            category: 'datasheet',
            question: 'Existe datasheet disponível para este produto?',
            answer: product.pdf
                ? 'Sim. A página do produto possui um link direto para abrir o datasheet disponível.'
                : 'No momento não há datasheet público vinculado a este item no site. A equipe TOR pode orientar o envio da documentação disponível.'
        },
        {
            category: 'cotacao',
            question: 'O que devo enviar para cotar este item?',
            answer: 'Envie o código do produto, quantidade desejada, dados de contato e, se houver, observações de compatibilidade exigidas pelo seu projeto.'
        },
        {
            category: 'conectividade',
            question: 'Este módulo funciona em qualquer switch?',
            answer: 'A compatibilidade depende da porta do equipamento, taxa suportada, firmware, padrão óptico, conector e tipo de fibra. Use o código do item para solicitar validação comercial e técnica com a TOR.'
        },
        {
            category: 'aplicacao',
            question: 'Este produto pode ser usado em projetos públicos e privados?',
            answer: 'Sim. A TOR fabrica equipamentos para demandas técnicas de telecomunicações em projetos públicos e privados, respeitando as especificações do item escolhido.'
        }
    ];

    const categories = [
        ['todos', 'Todas'],
        ['aplicacao', 'Aplicação'],
        ['conectividade', 'Conectividade'],
        ['comparacao', 'Comparação'],
        ['datasheet', 'Datasheet'],
        ['cotacao', 'Cotação']
    ];

    document.title = `Dúvidas sobre ${product.name} | TOR Tecnologia`;
    setText('questionBreadcrumbProduct', product.name);
    setText('questionProductTitle', product.name);
    setText('questionProductDescription', product.description);
    setText('questionProductCode', product.code || product.name);
    setText('questionProductFamily', product.family || 'TOR');
    setText('questionProductType', product.type || 'Produto TOR');

    const image = document.getElementById('questionProductImage');
    const imageNote = document.getElementById('questionProductImageNote');
    if (image && media) {
        image.src = media.src;
        image.alt = product.name;
        image.hidden = false;
        if (imageNote) imageNote.textContent = media.note;
    }

    const detailLink = document.getElementById('questionProductDetail');
    const supportLink = document.getElementById('questionProductSupport');
    const supportBottomLink = document.getElementById('questionProductSupportBottom');
    const askTopLink = document.getElementById('questionAskTop');
    if (detailLink) detailLink.href = detailUrl;
    if (supportLink) supportLink.href = supportUrl;
    if (supportBottomLink) supportBottomLink.href = supportUrl;
    if (askTopLink) askTopLink.href = supportUrl;

    const categoryList = document.getElementById('questionCategories');
    const qaList = document.getElementById('questionList');
    const resultCount = document.getElementById('questionResultCount');

    const renderCategories = () => {
        if (!categoryList) return;
        categoryList.innerHTML = categories.map(([key, label]) => {
            const count = key === 'todos' ? qaItems.length : qaItems.filter((item) => item.category === key).length;
            return `<button type="button" class="${key === activeCategory ? 'active' : ''}" data-category="${key}">${label} (${count})</button>`;
        }).join('');

        categoryList.querySelectorAll('button').forEach((button) => {
            button.addEventListener('click', () => {
                activeCategory = button.dataset.category;
                renderCategories();
                renderQuestions();
            });
        });
    };

    const renderQuestions = () => {
        const visibleItems = activeCategory === 'todos'
            ? qaItems
            : qaItems.filter((item) => item.category === activeCategory);

        if (resultCount) {
            resultCount.textContent = `${visibleItems.length} dúvida(s) encontrada(s)`;
        }

        if (!qaList) return;
        qaList.innerHTML = visibleItems.map((item) => `
            <article class="question-entry">
                <div class="question-entry-line">
                    <strong>Q:</strong>
                    <h3>${escapeHtml(item.question)}</h3>
                </div>
                <div class="question-entry-line">
                    <strong>A:</strong>
                    <p>${escapeHtml(item.answer)}</p>
                </div>
                <div class="question-entry-meta">
                    <span>Categoria: ${escapeHtml(categories.find(([key]) => key === item.category)?.[1] || item.category)}</span>
                    <a href="${supportUrl}">Enviar dúvida sobre este item</a>
                </div>
            </article>
        `).join('');
    };

    const specsGrid = document.getElementById('questionSpecsGrid');
    if (specsGrid) {
        specsGrid.innerHTML = [
            ['Taxa', specs.Taxa || 'Sob consulta'],
            ['Alcance', specs.Alcance || 'Sob consulta'],
            ['Conector', specs.Conector || specs.Interface || 'Sob consulta'],
            ['Fibra/Meio', specs.Fibra || specs.Cabo || 'Sob consulta']
        ].map(([label, value]) => `
            <div>
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
            </div>
        `).join('');
    }

    renderCategories();
    renderQuestions();
})();
