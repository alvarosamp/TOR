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
            console.error('Não foi possível carregar o catálogo.', error);
            return [];
        }
    };

    const products = await loadProducts();
    const catalogGrid = document.getElementById('catalogGrid');
    const catalogEmpty = document.getElementById('catalogEmpty');
    const catalogResults = document.getElementById('catalogResults');
    const catalogSearch = document.getElementById('catalogSearch');
    const filterButtons = document.querySelectorAll('.filter-button');
    const rateFilter = document.getElementById('rateFilter');
    const reachFilter = document.getElementById('reachFilter');
    const fiberFilter = document.getElementById('fiberFilter');
    const connectorFilter = document.getElementById('connectorFilter');
    const productModal = document.getElementById('productModal');
    const modalClose = document.getElementById('modalClose');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalBadges = document.getElementById('modalBadges');
    const modalSpecs = document.getElementById('modalSpecs');
    const modalPdf = document.getElementById('modalPdf');
    const modalDetail = document.getElementById('modalDetail');
    const modalQuote = document.getElementById('modalQuote');
    const modalProductMedia = document.getElementById('modalProductMedia');
    const normalize = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    const allowedFilters = ['todos', 'sfp', 'qsfp'];
    const requestedFilter = new URLSearchParams(window.location.search).get('categoria');
    let activeFilter = allowedFilters.includes(normalize(requestedFilter)) ? normalize(requestedFilter) : 'todos';

    if (!catalogGrid) return;

    const productUrl = (product) => `produto-detalhe.html?produto=${encodeURIComponent(product.code || product.name)}`;
    const productMedia = (product) => window.TOR_PRODUCT_MEDIA && window.TOR_PRODUCT_MEDIA[product.code];
    const escapeHtml = (value) => String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const isEnglish = window.location.pathname.includes('/en/');
    const assetUrl = (url) => (isEnglish && url && !url.startsWith('../') && !/^https?:/i.test(url)) ? `../${url}` : url;
    const isBidiProduct = (product) => normalize([
        product.type,
        product.description,
        product.specs && product.specs['Comprimento de onda']
    ].join(' ')).includes('bidi');
    const isElectricalProduct = (product) => normalize([
        product.type,
        product.description,
        product.specs && product.specs.Interface,
        product.specs && product.specs.Cabo,
        product.specs && product.specs.Conector
    ].join(' ')).includes('rj45')
        || normalize(product.description).includes('rj-45')
        || normalize(product.description).includes('base-t')
        || normalize(product.specs && product.specs.Cabo).includes('cobre')
        || normalize(product.specs && product.specs.Cabo).includes('copper');
    const techBadges = (product) => {
        const specs = product.specs || {};
        const labels = [];
        if (isBidiProduct(product)) labels.push('BiDi');
        labels.push(isElectricalProduct(product) ? (isEnglish ? 'Electrical' : 'Elétrico') : (isEnglish ? 'Optical' : 'Óptico'));
        if (specs.Taxa) labels.push(specs.Taxa);
        if (specs.Alcance) labels.push(specs.Alcance);
        if (specs.Fibra || specs.Cabo) labels.push(specs.Fibra || specs.Cabo);
        return labels.map((label) => `<span class="catalog-badge tech">${escapeHtml(label)}</span>`).join('');
    };

    const productText = (product) => normalize([
        product.name,
        product.code,
        product.category,
        product.family,
        product.type,
        ...(product.aliases || []),
        product.description,
        ...Object.values(product.specs || {})
    ].join(' '));

    const compactText = (value) => normalize(value).replace(/[^a-z0-9]/g, '');
    const numericText = (value) => normalize(value).replace(',', '.');
    const hasAny = (text, terms) => terms.some((term) => text.includes(term));
    const productRateGbps = (product) => {
        const specs = product.specs || {};
        const code = compactText(product.code || product.name);
        const rateValue = numericText(specs.Taxa || '');
        const numericMatch = rateValue.match(/(\d+(?:\.\d+)?)/);
        if (numericMatch) return Number(numericMatch[1]);
        if (code.includes('qsfp100g')) return 100;
        if (code.includes('qsfp40g')) return 40;
        if (code.includes('sfp25g') || code.includes('dac25g')) return 25;
        if (code.includes('sfp10g')) return 10;
        if (code.includes('sfp1g')) return 1.25;
        return null;
    };
    const rateInRange = (value, min, max) => value !== null && value >= min && value < max;

    const matchesFilter = (product) => {
        if (activeFilter === 'todos') return true;
        if (activeFilter === 'sfp') return product.family === 'SFP';
        if (activeFilter === 'qsfp') return product.family === 'QSFP';
        return false;
    };

    const matchesSearch = (product) => {
        const term = normalize(catalogSearch.value).trim();
        if (!term) return true;
        return productText(product).includes(term);
    };

    const matchesTechnicalFilters = (product) => {
        const text = productText(product);
        const compact = compactText(text);
        const rateText = normalize([
            product.name,
            product.code,
            product.type,
            product.specs && product.specs.Taxa
        ].join(' '));
        const productCodeCompact = compactText(product.code || product.name);
        const rateCompact = compactText(rateText);
        const rateGbps = productRateGbps(product);
        const connectorText = normalize([
            product.specs && product.specs.Conector,
            product.specs && product.specs.Interface,
            product.specs && product.specs.Cabo,
            product.description
        ].join(' '));
        const connectorCompact = compactText(connectorText);
        const rate = rateFilter ? rateFilter.value : 'todos';
        const reach = reachFilter ? reachFilter.value : 'todos';
        const fiber = fiberFilter ? fiberFilter.value : 'todos';
        const connector = connectorFilter ? connectorFilter.value : 'todos';

        const rateOk = rate === 'todos'
            || (rate === '1g' && (rateInRange(rateGbps, 1, 2) || hasAny(rateCompact, ['sfp1g', '1000base'])))
            || (rate === '10g' && (rateInRange(rateGbps, 10, 11) || hasAny(rateCompact, ['sfp10g', 'sfpplus', '10gbase'])))
            || (rate === '25g' && (productCodeCompact.includes('sfp25g') || (rateInRange(rateGbps, 25, 26) && !productCodeCompact.includes('dac'))))
            || (rate === '40g' && (rateInRange(rateGbps, 40, 41) || productCodeCompact.includes('qsfp40g')))
            || (rate === '100g' && (rateInRange(rateGbps, 100, 101) || productCodeCompact.includes('qsfp100g')));

        const reachOk = reach === 'todos'
            || (reach === 'curto' && hasAny(compact, ['5m', '30m', '70m', '100m', '150m', '300m', '550m']))
            || (reach === '10km' && compact.includes('10km'))
            || (reach === '20km' && compact.includes('20km'));

        const fiberOk = fiber === 'todos'
            || (fiber === 'smf' && hasAny(text, ['smf', 'monomodo']))
            || (fiber === 'mmf' && hasAny(text, ['mmf', 'multimodo', 'om3', 'om4']))
            || (fiber === 'cobre' && hasAny(text, ['rj45', 'rj-45', 'cobre', 'copper', 'cat5', 'cat 5', 'cat6', 'cat6a', 'cat7', 'dac']));

        const connectorOk = connector === 'todos'
            || (connector === 'lc' && connectorCompact.includes('lc'))
            || (connector === 'mpo' && hasAny(connectorCompact, ['mpo', 'mtp']))
            || (connector === 'rj45' && hasAny(connectorCompact, ['rj45', 'rj451001000baset', '1000baset', '10gbaset']));

        return rateOk && reachOk && fiberOk && connectorOk;
    };

    const renderCatalog = () => {
        const publicProducts = products.filter((product) => product.family === 'SFP' || product.family === 'QSFP');
        const visibleProducts = publicProducts.filter((product) => (
            matchesFilter(product) && matchesSearch(product) && matchesTechnicalFilters(product)
        ));

        catalogGrid.innerHTML = visibleProducts.map((product) => {
            const index = products.indexOf(product);
            const specs = product.specs || {};
            const media = productMedia(product);
            return `
                <button type="button" class="catalog-card" data-index="${index}">
                    ${media ? `
                        <span class="catalog-card-media">
                            <img src="${media.src}" alt="${product.name}">
                        </span>
                    ` : ''}
                    <span class="catalog-card-type">${product.type}</span>
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                    <div class="catalog-card-specs">
                        <span>${specs.Taxa || 'Taxa sob consulta'}</span>
                        <span>${specs.Alcance || 'Alcance sob consulta'}</span>
                        <span>${specs.Conector || specs.Interface || 'Interface sob consulta'}</span>
                    </div>
                    <span class="catalog-card-hint">Clique para abrir a página do produto</span>
                    <div class="catalog-badges">
                        <span class="catalog-badge">${product.family}</span>
                        ${techBadges(product)}
                    </div>
                </button>
            `;
        }).join('');

        catalogResults.textContent = `${visibleProducts.length} item(ns) encontrado(s)`;
        catalogEmpty.innerHTML = `
            <h4>Nenhum item encontrado</h4>
            <p>Esse filtro ainda não tem produto disponível ou a busca não encontrou correspondências.</p>
        `;
        catalogEmpty.hidden = visibleProducts.length > 0;

        document.querySelectorAll('.catalog-card').forEach((card) => {
            card.addEventListener('click', () => {
                const product = products[Number(card.dataset.index)];
                if (product) window.location.href = productUrl(product);
            });
        });
    };

    const openProduct = (index) => {
        const product = products[index];
        if (!product) return;

        modalTitle.textContent = product.name;
        modalDescription.textContent = product.description;
        const media = productMedia(product);
        if (modalProductMedia) {
            if (media) {
                modalProductMedia.innerHTML = `<img src="${media.src}" alt="${product.name}"><span>${media.note}</span>`;
                modalProductMedia.hidden = false;
            } else {
                modalProductMedia.hidden = true;
            }
        }
        modalBadges.innerHTML = `
            <span class="catalog-badge">${product.family}</span>
            <span class="catalog-badge">${product.type}</span>
            ${techBadges(product)}
        `;
        modalSpecs.innerHTML = Object.entries(product.specs || {}).map(([label, value]) => `
            <div class="spec-item">
                <strong>${label}</strong>
                <span>${value}</span>
            </div>
        `).join('');
        if (product.pdf) {
            modalPdf.href = assetUrl(product.pdf);
            modalPdf.hidden = false;
        } else {
            modalPdf.hidden = true;
        }
        if (modalDetail) modalDetail.href = productUrl(product);
        modalQuote.href = `suporte.html?produto=${encodeURIComponent(product.name)}`;
        productModal.hidden = false;
        document.body.style.overflow = 'hidden';
        modalClose.focus();
    };

    const closeProduct = () => {
        productModal.hidden = true;
        document.body.style.overflow = '';
    };

    filterButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.filter === activeFilter);
        button.addEventListener('click', () => {
            filterButtons.forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.dataset.filter;
            renderCatalog();
        });
    });

    catalogSearch.addEventListener('input', renderCatalog);
    [rateFilter, reachFilter, fiberFilter, connectorFilter].forEach((select) => {
        if (select) select.addEventListener('change', renderCatalog);
    });
    modalClose.addEventListener('click', closeProduct);
    productModal.addEventListener('click', (event) => {
        if (event.target === productModal) closeProduct();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !productModal.hidden) closeProduct();
    });

    renderCatalog();
})();
