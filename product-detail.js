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
            console.error('Não foi possível carregar o produto.', error);
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

    const setText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    };

    const productUrl = (item) => `produto-detalhe.html?produto=${encodeURIComponent(item.code || item.name)}`;
    const questionsUrl = (item) => `produto-duvidas.html?produto=${encodeURIComponent(item.code || item.name)}`;
    const productMedia = (item) => window.TOR_PRODUCT_MEDIA && window.TOR_PRODUCT_MEDIA[item.code];
    const specs = product ? product.specs || {} : {};

    const normalizeText = (value) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const getSpec = (item, key) => item && item.specs ? item.specs[key] || '' : '';

    const parseSpeedGbps = (value) => {
        const text = normalizeText(value).replace(',', '.');
        const match = text.match(/(\d+(?:\.\d+)?)\s*g/);
        return match ? Number(match[1]) : 0;
    };

    const parseReachMeters = (value) => {
        const text = normalizeText(value).replace(',', '.');
        const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(km|m)\b/g)];
        if (!matches.length) return 0;
        return Math.max(...matches.map((match) => Number(match[1]) * (match[2] === 'km' ? 1000 : 1)));
    };

    const sameNormalizedSpec = (a, b, key) => normalizeText(getSpec(a, key)) === normalizeText(getSpec(b, key));

    const buildSimilarProducts = (current, list, limit = 6) => {
        const currentSpeed = parseSpeedGbps(getSpec(current, 'Taxa'));
        const currentReach = parseReachMeters(getSpec(current, 'Alcance'));
        const currentFiber = normalizeText(getSpec(current, 'Fibra') || getSpec(current, 'Cabo'));
        const currentConnector = normalizeText(getSpec(current, 'Conector') || getSpec(current, 'Interface'));
        const currentType = normalizeText(current.type);

        return list
            .filter((item) => item.code !== current.code)
            .map((item) => {
                let score = 0;
                const reasons = [];
                const itemSpeed = parseSpeedGbps(getSpec(item, 'Taxa'));
                const itemReach = parseReachMeters(getSpec(item, 'Alcance'));
                const itemFiber = normalizeText(getSpec(item, 'Fibra') || getSpec(item, 'Cabo'));
                const itemConnector = normalizeText(getSpec(item, 'Conector') || getSpec(item, 'Interface'));
                const itemType = normalizeText(item.type);

                if (item.family === current.family) {
                    score += 28;
                    reasons.push(`mesma família ${item.family}`);
                }

                if (currentSpeed && itemSpeed && currentSpeed === itemSpeed) {
                    score += 26;
                    reasons.push(`mesma taxa: ${getSpec(item, 'Taxa')}`);
                } else if (currentSpeed && itemSpeed && Math.abs(currentSpeed - itemSpeed) / Math.max(currentSpeed, itemSpeed) <= 0.25) {
                    score += 10;
                    reasons.push(`taxa próxima: ${getSpec(item, 'Taxa')}`);
                }

                if (currentFiber && itemFiber && currentFiber === itemFiber) {
                    score += 18;
                    reasons.push(`mesma fibra: ${getSpec(item, 'Fibra') || getSpec(item, 'Cabo')}`);
                }

                if (currentConnector && itemConnector && currentConnector === itemConnector) {
                    score += 14;
                    reasons.push(`mesmo conector: ${getSpec(item, 'Conector') || getSpec(item, 'Interface')}`);
                }

                if (sameNormalizedSpec(current, item, 'Comprimento de onda')) {
                    score += 8;
                    reasons.push(`mesmo comprimento de onda`);
                }

                if (currentReach && itemReach) {
                    const reachRatio = Math.max(currentReach, itemReach) / Math.min(currentReach, itemReach);
                    if (reachRatio <= 1.5) {
                        score += 10;
                        reasons.push(`alcance parecido: ${getSpec(item, 'Alcance')}`);
                    } else if (reachRatio <= 5) {
                        score += 4;
                    }
                }

                if (currentType.includes('bidi') && itemType.includes('bidi')) {
                    score += 10;
                    reasons.push('alternativa BiDi');
                }

                if (currentType.includes('sr') && itemType.includes('sr')) score += 5;
                if (currentType.includes('lr') && itemType.includes('lr')) score += 5;

                return { ...item, similarityScore: score, similarityReasons: reasons.slice(0, 3) };
            })
            .filter((item) => item.similarityScore > 0)
            .sort((a, b) => b.similarityScore - a.similarityScore || a.name.localeCompare(b.name))
            .slice(0, limit);
    };

    if (!product) return;

    const isQsfp = product.family === 'QSFP';
    const fiber = normalize(specs.Fibra);
    const connector = normalize(specs.Conector || specs.Interface);
    const reach = specs.Alcance || 'sob consulta';
    const rate = specs.Taxa || 'sob consulta';

    const connectivityCards = [
        {
            title: isQsfp ? 'Backbone e alta capacidade' : 'Acesso e agregação',
            text: isQsfp
                ? 'Indicado para interconexões de maior taxa entre equipamentos compatíveis com QSFP/QSFP28.'
                : 'Indicado para enlaces ópticos de acesso, uplink e agregação em switches, roteadores e OLTs compatíveis.',
            items: [`Taxa ${rate}`, `Alcance ${reach}`, specs.Fibra ? `Meio ${specs.Fibra}` : 'Meio conforme aplicação']
        },
        {
            title: fiber.includes('mmf') ? 'Ambientes internos' : 'Enlaces monomodo',
            text: fiber.includes('mmf')
                ? 'Aplicação comum em salas técnicas, racks próximos e interconexões internas de curta distância.'
                : 'Aplicação comum em enlaces entre salas técnicas, POPs, prédios ou trechos que exigem maior alcance.',
            items: [specs['Comprimento de onda'] || 'Comprimento de onda sob consulta', specs.Conector || specs.Interface || 'Conector sob consulta']
        },
        {
            title: 'Compatibilidade operacional',
            text: 'A seleção deve considerar porta do equipamento, taxa suportada, tipo de fibra, conector e orçamento óptico.',
            items: ['Validação por código do item', 'Datasheet disponível', 'Apoio para escolha do modelo TOR']
        }
    ];

    const featureItems = [
        specs.DDM ? `Monitoramento DDM: ${specs.DDM}` : 'Monitoramento digital conforme modelo',
        specs.Temperatura ? `Faixa de temperatura: ${specs.Temperatura}` : 'Faixa de operação conforme datasheet',
        connector.includes('lc') ? 'Conector LC para enlaces duplex' : null,
        connector.includes('mpo') || connector.includes('mtp') ? 'Conector MPO/MTP para aplicações paralelas de alta capacidade' : null,
        fiber.includes('smf') ? 'Uso em fibra monomodo' : null,
        fiber.includes('mmf') ? 'Uso em fibra multimodo' : null,
        product.datasheetStatus || 'Documentação técnica disponível'
    ].filter(Boolean);

    const qaItems = [
        {
            q: 'Como confirmar se este módulo atende minha aplicação?',
            a: 'Compare taxa, alcance, tipo de fibra, conector e padrão óptico com a porta do equipamento onde o módulo será instalado.'
        },
        {
            q: 'O datasheet pode ser usado para cotação técnica?',
            a: product.pdf
                ? 'Sim. O botão de datasheet abre o documento técnico disponível para este item.'
                : 'Este item ainda está sem datasheet público no site. A equipe TOR pode orientar o envio da documentação disponível.'
        },
        {
            q: 'Posso solicitar apoio para escolher outro modelo TOR?',
            a: 'Sim. Informe a taxa, alcance, fibra e equipamento de destino para a equipe indicar o modelo mais adequado do catálogo TOR.'
        }
    ];

    document.title = `${product.name} | TOR Tecnologia`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', `${product.name}: ${product.description}`);

    setText('breadcrumbProduct', product.name);
    setText('productVisualFamily', product.family || 'TOR');
    setText('productVisualCode', product.code || product.name);
    setText('productTitle', product.name);
    setText('productDescription', product.description);
    setText('productFamilyLabel', product.family || 'Módulo óptico');
    setText('productCodeLabel', product.code || product.name);
    setText('stickyProductName', product.name);
    setText('stickyProductCode', product.code || product.name);

    const media = productMedia(product);
    const productPhotoFrame = document.getElementById('productPhotoFrame');
    const productImage = document.getElementById('productImage');
    const productImageNote = document.getElementById('productImageNote');
    const productVisualFallback = document.getElementById('productVisualFallback');
    const galleryThumbs = document.getElementById('productGalleryThumbs');
    const modelOptions = document.getElementById('productModelOptions');

    if (media && productPhotoFrame && productImage) {
        productImage.src = media.src;
        productImage.alt = product.name;
        if (productImageNote) productImageNote.textContent = media.note;
        productPhotoFrame.hidden = false;
        if (productVisualFallback) productVisualFallback.hidden = true;
    }

    const relatedItems = buildSimilarProducts(product, publicProducts, 6);

    const galleryItems = [
        { product, media, label: 'Produto' },
        ...relatedItems
            .map((item) => ({ product: item, media: productMedia(item), label: item.family }))
            .filter((item) => item.media)
            .slice(0, 5)
    ].filter((item) => item.media);

    if (galleryThumbs && galleryItems.length > 0 && productImage) {
        galleryThumbs.innerHTML = galleryItems.map((item, index) => `
            <button type="button" class="${index === 0 ? 'active' : ''}" data-src="${escapeHtml(item.media.src)}" data-note="${escapeHtml(item.media.note)}" data-name="${escapeHtml(item.product.name)}">
                <img src="${escapeHtml(item.media.src)}" alt="${escapeHtml(item.product.name)}">
                <span>${escapeHtml(item.label)}</span>
            </button>
        `).join('');

        galleryThumbs.querySelectorAll('button').forEach((button) => {
            button.addEventListener('click', () => {
                galleryThumbs.querySelectorAll('button').forEach((item) => item.classList.remove('active'));
                button.classList.add('active');
                productImage.src = button.dataset.src;
                productImage.alt = button.dataset.name;
                if (productImageNote) productImageNote.textContent = button.dataset.note;
                if (productPhotoFrame) productPhotoFrame.hidden = false;
                if (productVisualFallback) productVisualFallback.hidden = true;
            });
        });
    }

    if (modelOptions) {
        modelOptions.innerHTML = relatedItems.map((item) => `
            <a href="${productUrl(item)}">
                ${productMedia(item) ? `<img src="${escapeHtml(productMedia(item).src)}" alt="">` : ''}
                <div>
                    <span>${escapeHtml(item.name)}</span>
                    <small>${escapeHtml((item.similarityReasons || [item.type])[0])}</small>
                </div>
            </a>
        `).join('');
    }

    const badges = document.getElementById('productBadges');
    if (badges) {
        badges.innerHTML = `
            <span class="catalog-badge ${escapeHtml(product.statusClass || '')}">${escapeHtml(product.datasheetStatus)}</span>
            <span class="catalog-badge">${escapeHtml(product.family)}</span>
            <span class="catalog-badge">${escapeHtml(product.type)}</span>
        `;
    }

    const highlights = document.getElementById('productHighlights');
    if (highlights) {
        highlights.innerHTML = [
            specs.Taxa ? `Taxa: ${specs.Taxa}` : null,
            specs.Alcance ? `Alcance: ${specs.Alcance}` : null,
            specs.Conector ? `Conector: ${specs.Conector}` : specs.Interface ? `Interface: ${specs.Interface}` : null,
            specs.Fibra ? `Fibra: ${specs.Fibra}` : specs.Cabo ? `Cabo: ${specs.Cabo}` : null
        ].filter(Boolean).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    }

    const specCards = document.getElementById('productSpecCards');
    if (specCards) {
        specCards.innerHTML = [
            ['Taxa', specs.Taxa || 'Sob consulta'],
            ['Alcance', specs.Alcance || 'Sob consulta'],
            ['Conector', specs.Conector || specs.Interface || 'Sob consulta'],
            ['Fibra', specs.Fibra || specs.Cabo || 'Sob consulta']
        ].map(([label, value]) => `
            <div class="product-stat">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
            </div>
        `).join('');
    }

    const inlineQuote = document.getElementById('productQuoteInline');
    if (inlineQuote) inlineQuote.href = `suporte.html?produto=${encodeURIComponent(product.name)}`;
    const questionsPage = document.getElementById('productQuestionsPage');
    if (questionsPage) questionsPage.href = questionsUrl(product);
    const askQuestion = document.getElementById('productAskQuestion');
    if (askQuestion) askQuestion.href = `suporte.html?produto=${encodeURIComponent(product.name)}`;

    const table = document.getElementById('productSpecsTable');
    if (table) {
        table.innerHTML = Object.entries(specs).map(([label, value]) => `
            <tr>
                <th>${escapeHtml(label)}</th>
                <td>${escapeHtml(value)}</td>
            </tr>
        `).join('') + `
            <tr>
                <th>Documentação</th>
                <td>${escapeHtml(product.datasheetStatus)}</td>
            </tr>
        `;
    }

    const connectivity = document.getElementById('productConnectivity');
    if (connectivity) {
        connectivity.innerHTML = connectivityCards.map((card) => `
            <article class="product-info-card">
                <h3>${escapeHtml(card.title)}</h3>
                <p>${escapeHtml(card.text)}</p>
                <ul class="product-specs">
                    ${card.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </article>
        `).join('');
    }

    const connectivityStage = document.getElementById('productConnectivityStage');
    if (connectivityStage) {
        const mediaSrc = media ? media.src : '';
        const cableLabel = fiber.includes('mmf') ? 'Fibra multimodo' : fiber.includes('smf') ? 'Fibra monomodo' : 'Meio compatível';
        connectivityStage.innerHTML = `
            <div class="connectivity-endpoint">
                <strong>Equipamento A</strong>
                <span>Switch ou roteador compatível</span>
            </div>
            <div class="connectivity-module">
                ${mediaSrc ? `<img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(product.name)}">` : ''}
                <strong>${escapeHtml(product.name)}</strong>
                <span>${escapeHtml(rate)} / ${escapeHtml(reach)}</span>
            </div>
            <div class="connectivity-cable">
                <span>${escapeHtml(cableLabel)}</span>
            </div>
            <div class="connectivity-module">
                ${mediaSrc ? `<img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(product.name)}">` : ''}
                <strong>${escapeHtml(product.family)} remoto</strong>
                <span>${escapeHtml(specs.Conector || specs.Interface || 'Conector compatível')}</span>
            </div>
            <div class="connectivity-endpoint">
                <strong>Equipamento B</strong>
                <span>Switch, servidor, OLT ou porta óptica</span>
            </div>
        `;
    }

    const features = document.getElementById('productFeatures');
    if (features) {
        features.innerHTML = featureItems.map((item) => `
            <li>
                <strong>${escapeHtml(item.split(':')[0])}</strong>
                <span>${escapeHtml(item.includes(':') ? item.split(':').slice(1).join(':').trim() : item)}</span>
            </li>
        `).join('');
    }

    const qa = document.getElementById('productQa');
    if (qa) {
        qa.innerHTML = qaItems.map((item) => `
            <details class="qa-item">
                <summary>${escapeHtml(item.q)}</summary>
                <p>${escapeHtml(item.a)}</p>
            </details>
        `).join('');
    }

    const resources = document.getElementById('productResources');
    if (resources) {
        resources.innerHTML = `
            ${product.pdf ? `<a href="${escapeHtml(product.pdf)}" target="_blank" rel="noopener">Datasheet do produto</a>` : ''}
            <a href="${questionsUrl(product)}">Dúvidas sobre este item</a>
            <a href="produtos.html">Voltar ao catálogo</a>
            <a href="suporte.html?produto=${encodeURIComponent(product.name)}">Solicitar cotação</a>
            <a href="conteudo.html">Conteúdo técnico TOR</a>
        `;
    }

    const related = document.getElementById('productRelated');
    if (related) {
        related.innerHTML = relatedItems.slice(0, 3).map((item) => `
            <a class="related-product" href="${productUrl(item)}">
                ${productMedia(item) ? `<img src="${escapeHtml(productMedia(item).src)}" alt="">` : ''}
                <span>${escapeHtml(item.type)}</span>
                <strong>${escapeHtml(item.name)}</strong>
                <small>${escapeHtml((item.similarityReasons || []).join(' • '))}</small>
                <em>${escapeHtml((item.specs && item.specs.Taxa) || 'Ver especificações')}</em>
            </a>
        `).join('');
    }

    const pdf = document.getElementById('productPdf');
    if (pdf) {
        if (product.pdf) {
            pdf.href = product.pdf;
            pdf.hidden = false;
        } else {
            pdf.hidden = true;
        }
    }

    const quote = document.getElementById('productQuote');
    if (quote) quote.href = `suporte.html?produto=${encodeURIComponent(product.name)}`;
    const stickyQuote = document.getElementById('stickyProductQuote');
    if (stickyQuote) stickyQuote.href = `suporte.html?produto=${encodeURIComponent(product.name)}`;
})();
