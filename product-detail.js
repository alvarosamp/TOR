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
    const isEnglish = window.location.pathname.includes('/en/');

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

    const ui = isEnglish ? {
        applicationTitle: isQsfp ? 'High-capacity interconnection' : 'Typical optical interconnection',
        applicationText: 'Visual reference for applying this TOR module in compatible telecom equipment.',
        moduleHotspot: 'Open this item',
        quoteHotspot: 'Request quote',
        datasheetHotspot: 'Open datasheet',
        relatedHotspot: 'Related TOR item',
        deviceA: 'Device A',
        deviceB: 'Device B',
        compatiblePort: 'Compatible optical port',
        remotePort: 'Remote optical port',
        torModule: 'TOR module',
        opticalLink: 'Optical link',
        similarItems: 'Related options',
        bidiNotice: 'BiDi modules must be used with a complementary TX/RX pair.',
        rj45Notice: 'RJ45 SFP modules use copper Ethernet cabling on the client side.',
        defaultNotice: 'Confirm rate, reach, fiber type and connector before purchase.'
    } : {
        applicationTitle: isQsfp ? 'Interconexão de alta capacidade' : 'Interconexão óptica típica',
        applicationText: 'Referência visual para aplicar este módulo TOR em equipamentos de telecomunicações compatíveis.',
        moduleHotspot: 'Abrir este item',
        quoteHotspot: 'Solicitar cotação',
        datasheetHotspot: 'Abrir datasheet',
        relatedHotspot: 'Item TOR relacionado',
        deviceA: 'Equipamento A',
        deviceB: 'Equipamento B',
        compatiblePort: 'Porta óptica compatível',
        remotePort: 'Porta óptica remota',
        torModule: 'Módulo TOR',
        opticalLink: 'Enlace óptico',
        similarItems: 'Opções relacionadas',
        bidiNotice: 'Módulos BiDi devem ser usados com par complementar TX/RX.',
        rj45Notice: 'Módulos SFP RJ45 usam cabeamento Ethernet em cobre no lado cliente.',
        defaultNotice: 'Confirme taxa, alcance, tipo de fibra e conector antes da compra.'
    };

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

    const buildConnectivityScenarios = () => {
        const isBidi = normalizeText(product.type).includes('bidi') || normalizeText(product.description).includes('bidi');
        const isRj45 = connector.includes('rj45') || normalizeText(product.description).includes('rj-45') || normalizeText(product.description).includes('rj45');
        const mediaSrc = media ? media.src : '';
        const related = relatedItems[0];
        const relatedMedia = related ? productMedia(related) : null;
        const cableLabel = isRj45
            ? 'Ethernet RJ45'
            : fiber.includes('mmf')
                ? (isEnglish ? 'Multimode fiber' : 'Fibra multimodo')
                : fiber.includes('smf')
                    ? (isEnglish ? 'Single-mode fiber' : 'Fibra monomodo')
                    : (isEnglish ? 'Compatible media' : 'Meio compatível');
        const scenarioNotice = isBidi ? ui.bidiNotice : isRj45 ? ui.rj45Notice : ui.defaultNotice;
        const primaryTab = isBidi
            ? (isEnglish ? 'BiDi point-to-point' : 'BiDi ponto a ponto')
            : isRj45
                ? (isEnglish ? 'SFP to RJ45 access' : 'Acesso SFP para RJ45')
                : isQsfp
                    ? (isEnglish ? 'QSFP backbone' : 'Backbone QSFP')
                    : (isEnglish ? 'Switch-to-switch' : 'Switch para switch');
        const alternateTab = isQsfp
            ? (isEnglish ? 'Core aggregation' : 'Agregação e core')
            : (isEnglish ? 'Access/uplink' : 'Acesso e uplink');

        return {
            tabs: [primaryTab, alternateTab, ui.similarItems],
            html: `
                <div class="connectivity-visual-card">
                    <div class="connectivity-visual-copy">
                        <span>${escapeHtml(product.family || 'TOR')}</span>
                        <h3>${escapeHtml(ui.applicationTitle)}</h3>
                        <p>${escapeHtml(ui.applicationText)}</p>
                    </div>
                    <div class="connectivity-diagram" aria-label="${escapeHtml(ui.applicationTitle)}">
                        <div class="diagram-device diagram-left">
                            <span>${escapeHtml(ui.deviceA)}</span>
                            <strong>${escapeHtml(ui.compatiblePort)}</strong>
                            <i></i><i></i><i></i><i></i><i></i><i></i>
                        </div>
                        <a class="diagram-product diagram-module-left hotspot-link" href="${productUrl(product)}" aria-label="${escapeHtml(ui.moduleHotspot)}">
                            ${mediaSrc ? `<img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(product.name)}">` : `<strong>${escapeHtml(product.family || 'TOR')}</strong>`}
                            <span>${escapeHtml(product.name)}</span>
                        </a>
                        <a class="diagram-fiber hotspot-link" href="${product.pdf ? escapeHtml(product.pdf) : productUrl(product)}" ${product.pdf ? 'target="_blank" rel="noopener"' : ''} aria-label="${escapeHtml(ui.datasheetHotspot)}">
                            <b></b><b></b>
                            <span>${escapeHtml(cableLabel)}</span>
                        </a>
                        <a class="diagram-product diagram-module-right hotspot-link" href="${related ? productUrl(related) : productUrl(product)}" aria-label="${escapeHtml(ui.relatedHotspot)}">
                            ${relatedMedia && relatedMedia.src ? `<img src="${escapeHtml(relatedMedia.src)}" alt="${escapeHtml(related.name)}">` : mediaSrc ? `<img src="${escapeHtml(mediaSrc)}" alt="${escapeHtml(product.name)}">` : `<strong>${escapeHtml(product.family || 'TOR')}</strong>`}
                            <span>${escapeHtml(related ? related.name : `${product.family || 'TOR'} remoto`)}</span>
                        </a>
                        <div class="diagram-device diagram-right">
                            <span>${escapeHtml(ui.deviceB)}</span>
                            <strong>${escapeHtml(ui.remotePort)}</strong>
                            <i></i><i></i><i></i><i></i><i></i><i></i>
                        </div>
                        <a class="connectivity-hotspot hotspot-module" href="${productUrl(product)}">${escapeHtml(ui.moduleHotspot)}</a>
                        <a class="connectivity-hotspot hotspot-datasheet" href="${product.pdf ? escapeHtml(product.pdf) : productUrl(product)}" ${product.pdf ? 'target="_blank" rel="noopener"' : ''}>${escapeHtml(ui.datasheetHotspot)}</a>
                        <a class="connectivity-hotspot hotspot-related" href="${related ? productUrl(related) : productUrl(product)}">${escapeHtml(ui.relatedHotspot)}</a>
                        <a class="connectivity-hotspot hotspot-quote" href="suporte.html?produto=${encodeURIComponent(product.name)}">${escapeHtml(ui.quoteHotspot)}</a>
                    </div>
                    <div class="connectivity-visual-footer">
                        <span>${escapeHtml(rate)}</span>
                        <span>${escapeHtml(reach)}</span>
                        <span>${escapeHtml(specs.Conector || specs.Interface || cableLabel)}</span>
                        <strong>${escapeHtml(scenarioNotice)}</strong>
                    </div>
                </div>
            `
        };
    };

    const buildConnectivityUsecases = () => {
        const isBidi = normalizeText(product.type).includes('bidi') || normalizeText(product.description).includes('bidi');
        const isRj45 = connector.includes('rj45') || normalizeText(product.description).includes('rj-45') || normalizeText(product.description).includes('rj45');
        const comparableItems = relatedItems.slice(0, 4);
        const complement = isBidi
            ? comparableItems.find((item) => normalizeText(item.type).includes('bidi') && parseSpeedGbps(getSpec(item, 'Taxa')) === parseSpeedGbps(rate))
            : comparableItems[0];
        const cableLabel = isRj45
            ? 'RJ45'
            : fiber.includes('mmf')
                ? (isEnglish ? 'Multimode fiber' : 'Fibra multimodo')
                : fiber.includes('smf')
                    ? (isEnglish ? 'Single-mode fiber' : 'Fibra monomodo')
                    : (isEnglish ? 'Compatible media' : 'Meio compativel');

        const switchFace = (name, subtitle) => `
            <div class="usecase-switch">
                <span>${escapeHtml(name)}</span>
                <strong>${escapeHtml(subtitle)}</strong>
                <div>${'<i></i>'.repeat(isQsfp ? 8 : 12)}</div>
            </div>
        `;

        const productNode = (item, label) => {
            const itemMedia = productMedia(item);
            return `
                <a class="usecase-product-node" href="${productUrl(item)}">
                    ${itemMedia && itemMedia.src ? `<img src="${escapeHtml(itemMedia.src)}" alt="${escapeHtml(item.name)}">` : `<em>${escapeHtml(item.family || 'TOR')}</em>`}
                    <small>${escapeHtml(label)}</small>
                    <strong>${escapeHtml(item.name)}</strong>
                </a>
            `;
        };

        const linkNode = (label, detail) => `
            <div class="usecase-link-node">
                <b></b><b></b>
                <span>${escapeHtml(label)}</span>
                <small>${escapeHtml(detail)}</small>
            </div>
        `;

        const caseCard = (title, description, topology, extraLink = '') => `
            <article class="connectivity-usecase-card">
                <div class="connectivity-usecase-head">
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(description)}</p>
                </div>
                <div class="connectivity-usecase-map">${topology}</div>
                <div class="connectivity-usecase-actions">
                    <a href="${productUrl(product)}">${escapeHtml(isEnglish ? 'View item' : 'Ver item')}</a>
                    ${product.pdf ? `<a href="${escapeHtml(product.pdf)}" target="_blank" rel="noopener">Datasheet</a>` : ''}
                    ${extraLink}
                    <a href="suporte.html?produto=${encodeURIComponent(product.name)}">${escapeHtml(isEnglish ? 'Request quote' : 'Solicitar cotacao')}</a>
                </div>
            </article>
        `;

        const cases = [];

        if (isBidi && complement) {
            cases.push(caseCard(
                isEnglish ? 'BiDi point-to-point pair' : 'Par BiDi ponto a ponto',
                isEnglish
                    ? 'This use case needs a complementary TX/RX module at the remote side.'
                    : 'Este caso de uso precisa de um modulo complementar TX/RX na ponta remota.',
                `
                    ${switchFace('Switch A', specs.Conector || product.family)}
                    ${productNode(product, isEnglish ? 'Side A' : 'Ponta A')}
                    ${linkNode(cableLabel, reach)}
                    ${productNode(complement, isEnglish ? 'Side B' : 'Ponta B')}
                    ${switchFace('Switch B', specs.Conector || product.family)}
                `,
                `<a href="${productUrl(complement)}">${escapeHtml(isEnglish ? 'Complementary item' : 'Item complementar')}</a>`
            ));
        }

        if (isRj45) {
            cases.push(caseCard(
                isEnglish ? 'Copper access from SFP slot' : 'Acesso em cobre pelo slot SFP',
                isEnglish
                    ? 'Use when the equipment has an SFP/SFP+ slot and the local side uses Ethernet copper.'
                    : 'Use quando o equipamento tem slot SFP/SFP+ e o lado local usa Ethernet em cobre.',
                `
                    ${switchFace(isEnglish ? 'Network equipment' : 'Equipamento de rede', product.family)}
                    ${productNode(product, 'TOR')}
                    ${linkNode('Ethernet RJ45', reach)}
                    <div class="usecase-client-node"><strong>RJ45</strong><span>${escapeHtml(specs.Cabo || specs.Interface || 'Ethernet')}</span></div>
                `
            ));
        } else {
            cases.push(caseCard(
                isQsfp ? (isEnglish ? 'Aggregation/backbone interconnection' : 'Interconexao de agregacao/backbone') : (isEnglish ? 'Switch-to-switch optical link' : 'Link optico switch para switch'),
                isEnglish
                    ? 'Typical use between compatible optical ports using the same rate, fiber type and connector.'
                    : 'Uso tipico entre portas opticas compativeis, respeitando taxa, fibra e conector.',
                `
                    ${switchFace(isEnglish ? 'Equipment A' : 'Equipamento A', product.family)}
                    ${productNode(product, 'TOR')}
                    ${linkNode(cableLabel, `${rate} / ${reach}`)}
                    ${productNode(complement || product, complement ? (isEnglish ? 'Related' : 'Relacionado') : 'TOR')}
                    ${switchFace(isEnglish ? 'Equipment B' : 'Equipamento B', specs.Conector || specs.Interface || product.family)}
                `,
                complement ? `<a href="${productUrl(complement)}">${escapeHtml(isEnglish ? 'Related item' : 'Item relacionado')}</a>` : ''
            ));
        }

        if (comparableItems.length) {
            cases.push(`
                <article class="connectivity-usecase-card connectivity-related-card">
                    <div class="connectivity-usecase-head">
                        <h3>${escapeHtml(isEnglish ? 'Similar TOR products' : 'Produtos similares TOR')}</h3>
                        <p>${escapeHtml(isEnglish ? 'Items with similar technical characteristics for nearby applications.' : 'Itens com caracteristicas tecnicas proximas para aplicacoes semelhantes.')}</p>
                    </div>
                    <div class="connectivity-related-grid">
                        ${comparableItems.map((item) => {
                            const itemMedia = productMedia(item);
                            return `
                                <a href="${productUrl(item)}">
                                    ${itemMedia && itemMedia.src ? `<img src="${escapeHtml(itemMedia.src)}" alt="${escapeHtml(item.name)}">` : `<em>${escapeHtml(item.family || 'TOR')}</em>`}
                                    <strong>${escapeHtml(item.name)}</strong>
                                    <span>${escapeHtml(getSpec(item, 'Taxa') || item.type)} - ${escapeHtml(getSpec(item, 'Alcance') || item.family)}</span>
                                </a>
                            `;
                        }).join('')}
                    </div>
                </article>
            `);
        }

        return `
            <div class="connectivity-usecase-intro">
                <span>${escapeHtml(product.family || 'TOR')}</span>
                <h3>${escapeHtml(isEnglish ? 'Connections and viable use cases' : 'Conexoes e casos de uso viaveis')}</h3>
                <p>${escapeHtml(isEnglish ? 'Examples based on this product family, interface, reach and related TOR items.' : 'Exemplos baseados na familia do produto, interface, alcance e itens TOR relacionados.')}</p>
            </div>
            <div class="connectivity-usecase-grid">${cases.join('')}</div>
        `;
    };

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

    if (media && productPhotoFrame && productImage) {
        productImage.src = media.src;
        productImage.alt = product.name;
        if (productImageNote) productImageNote.textContent = media.note;
        productPhotoFrame.hidden = false;
        if (productVisualFallback) productVisualFallback.hidden = true;
    }

    const relatedItems = buildSimilarProducts(product, publicProducts, 6);

    const productImages = media && Array.isArray(media.images) ? media.images : [];
    const galleryItems = productImages
        .filter((item) => item && item.src)
        .map((item, index) => ({
            src: item.src,
            note: item.note || media.note || 'Imagem do datasheet',
            name: item.alt || product.name,
            label: item.label || `Imagem ${index + 1}`
        }));

    if (galleryThumbs && galleryItems.length > 1 && productImage) {
        galleryThumbs.hidden = false;
        galleryThumbs.innerHTML = galleryItems.map((item, index) => `
            <button type="button" class="${index === 0 ? 'active' : ''}" data-src="${escapeHtml(item.src)}" data-note="${escapeHtml(item.note)}" data-name="${escapeHtml(item.name)}">
                <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.name)}">
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
    } else if (galleryThumbs) {
        galleryThumbs.innerHTML = '';
        galleryThumbs.hidden = true;
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
        connectivityStage.innerHTML = buildConnectivityUsecases();
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
        related.innerHTML = '';
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
