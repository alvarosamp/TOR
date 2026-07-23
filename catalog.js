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
    const normalize = (value) => String(value || '').toLowerCase();
    const allowedFilters = ['todos', 'sfp', 'qsfp'];
    const requestedFilter = new URLSearchParams(window.location.search).get('categoria');
    let activeFilter = allowedFilters.includes(normalize(requestedFilter)) ? normalize(requestedFilter) : 'todos';

    if (!catalogGrid) return;

    const productUrl = (product) => `produto-detalhe.html?produto=${encodeURIComponent(product.code || product.name)}`;
    const productMedia = (product) => window.TOR_PRODUCT_MEDIA && window.TOR_PRODUCT_MEDIA[product.code];

    const productText = (product) => normalize([
        product.name,
        product.code,
        product.category,
        product.family,
        product.type,
        product.datasheetStatus,
        product.description,
        ...Object.values(product.specs || {})
    ].join(' '));

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
        const rateText = normalize([
            product.name,
            product.code,
            product.type,
            product.specs && product.specs.Taxa
        ].join(' '));
        const rate = rateFilter ? rateFilter.value : 'todos';
        const reach = reachFilter ? reachFilter.value : 'todos';
        const fiber = fiberFilter ? fiberFilter.value : 'todos';
        const connector = connectorFilter ? connectorFilter.value : 'todos';

        const rateOk = rate === 'todos'
            || (rate === '1g' && (rateText.includes('1,25 gb/s') || rateText.includes('sfp1g') || rateText.includes('1000base')))
            || (rate === '10g' && (rateText.includes('10 gb/s') || rateText.includes('10gbase') || rateText.includes('sfp+')))
            || (rate === '25g' && (rateText.includes('25 gb') || rateText.includes('25,') || rateText.includes('sfp28') || rateText.includes('sfp25g')))
            || (rate === '40g' && (rateText.includes('40 gb') || rateText.includes('qsfp40g')))
            || (rate === '100g' && (rateText.includes('100 gb') || rateText.includes('qsfp100g')));

        const reachOk = reach === 'todos'
            || (reach === 'curto' && (text.includes('100 m') || text.includes('300 m') || text.includes('550 m') || text.includes('70 m') || text.includes('150 m')))
            || (reach === '10km' && text.includes('10 km'))
            || (reach === '20km' && text.includes('20 km'));

        const fiberOk = fiber === 'todos'
            || (fiber === 'smf' && text.includes('smf'))
            || (fiber === 'mmf' && (text.includes('mmf') || text.includes('om3') || text.includes('om4')))
            || (fiber === 'cobre' && (text.includes('rj45') || text.includes('cobre') || text.includes('cat')));

        const connectorOk = connector === 'todos'
            || (connector === 'lc' && text.includes('lc'))
            || (connector === 'mpo' && (text.includes('mpo') || text.includes('mtp')))
            || (connector === 'rj45' && text.includes('rj45'));

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
                        <span class="catalog-badge ${product.statusClass || ''}">${product.datasheetStatus}</span>
                        <span class="catalog-badge">${product.family}</span>
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
            <span class="catalog-badge ${product.statusClass || ''}">${product.datasheetStatus}</span>
            <span class="catalog-badge">${product.family}</span>
            <span class="catalog-badge">${product.type}</span>
        `;
        modalSpecs.innerHTML = Object.entries(product.specs || {}).map(([label, value]) => `
            <div class="spec-item">
                <strong>${label}</strong>
                <span>${value}</span>
            </div>
        `).join('');
        if (product.pdf) {
            modalPdf.href = product.pdf;
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
