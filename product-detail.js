(function () {
    const products = window.TOR_CATALOG_PRODUCTS || [];
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('produto') || params.get('codigo') || '';
    const normalize = (value) => String(value || '').toLowerCase();

    const product = products.find((item) => (
        normalize(item.code) === normalize(requested)
        || normalize(item.name) === normalize(requested)
    )) || products[0];

    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    };

    if (!product) return;

    document.title = `${product.name} | TOR Tecnologia`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', `${product.name}: ${product.description}`);

    setText('breadcrumbProduct', product.name);
    setText('productVisualFamily', product.family || 'TOR');
    setText('productVisualCode', product.code || product.name);
    setText('productTitle', product.name);
    setText('productDescription', product.description);

    const badges = document.getElementById('productBadges');
    if (badges) {
        badges.innerHTML = `
            <span class="catalog-badge ${product.statusClass || ''}">${product.datasheetStatus}</span>
            <span class="catalog-badge">${product.family}</span>
            <span class="catalog-badge">${product.type}</span>
        `;
    }

    const highlights = document.getElementById('productHighlights');
    const specs = product.specs || {};
    if (highlights) {
        highlights.innerHTML = [
            specs.Taxa ? `Taxa: ${specs.Taxa}` : null,
            specs.Alcance ? `Alcance: ${specs.Alcance}` : null,
            specs.Conector ? `Conector: ${specs.Conector}` : specs.Interface ? `Interface: ${specs.Interface}` : null,
            specs.Fibra ? `Fibra: ${specs.Fibra}` : specs.Cabo ? `Cabo: ${specs.Cabo}` : null
        ].filter(Boolean).map((item) => `<li>${item}</li>`).join('');
    }

    const table = document.getElementById('productSpecsTable');
    if (table) {
        table.innerHTML = Object.entries(specs).map(([label, value], index) => `
            <tr${index % 2 === 0 ? ' style="background-color: var(--bg-gray);"' : ''}>
                <td style="padding: 15px; border: 1px solid var(--border-color); font-weight: 600; width: 30%;">${label}</td>
                <td style="padding: 15px; border: 1px solid var(--border-color);">${value}</td>
            </tr>
        `).join('') + `
            <tr>
                <td style="padding: 15px; border: 1px solid var(--border-color); font-weight: 600;">Documentação</td>
                <td style="padding: 15px; border: 1px solid var(--border-color);">${product.datasheetStatus}</td>
            </tr>
        `;
    }

    const pdf = document.getElementById('productPdf');
    if (pdf) pdf.href = product.pdf;

    const quote = document.getElementById('productQuote');
    if (quote) quote.href = `suporte.html?produto=${encodeURIComponent(product.name)}`;
})();
