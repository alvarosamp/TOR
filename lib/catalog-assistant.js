const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function normalize(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function publicCatalog(catalog) {
    return (catalog || []).filter((product) => product.family === 'SFP' || product.family === 'QSFP');
}

function productText(product) {
    return normalize([
        product.name,
        product.code,
        product.family,
        product.type,
        product.description,
        ...Object.entries(product.specs || {}).flat()
    ].join(' '));
}

function expandQuery(message) {
    const text = normalize(message);
    const terms = text.split(/[^a-z0-9,+/.-]+/).filter((term) => term.length > 1);
    const expansions = [];

    if (/\b100\s*g|\b100g|\bqsfp/.test(text)) expansions.push('100 gb/s', 'qsfp', 'qsfp28');
    if (/\b40\s*g|\b40g/.test(text)) expansions.push('40 gb/s', 'qsfp');
    if (/\b25\s*g|\b25g|sfp28/.test(text)) expansions.push('25 gb/s', 'sfp28');
    if (/\b10\s*g|\b10g|sfp\+/.test(text)) expansions.push('10 gb/s', 'sfp+');
    if (/\b1\s*g|\b1g|gigabit/.test(text)) expansions.push('1,25 gb/s', 'sfp1g');
    if (/monomodo|single.?mode|smf/.test(text)) expansions.push('smf', 'monomodo');
    if (/multimodo|multi.?mode|mmf|om3|om4/.test(text)) expansions.push('mmf', 'multimodo', 'om3', 'om4');
    if (/rj45|cobre|copper/.test(text)) expansions.push('rj45', 'cobre');
    if (/bidi|bi.?direcional/.test(text)) expansions.push('bidi', 'simplex');
    if (/lc/.test(text)) expansions.push('lc');
    if (/mpo|mtp/.test(text)) expansions.push('mpo', 'mtp');
    if (/10\s*km|10km/.test(text)) expansions.push('10 km');
    if (/20\s*km|20km/.test(text)) expansions.push('20 km');
    if (/100\s*m|100m/.test(text)) expansions.push('100 m');
    if (/300\s*m|300m/.test(text)) expansions.push('300 m');
    if (/550\s*m|550m/.test(text)) expansions.push('550 m');

    return [...new Set([...terms, ...expansions])];
}

function scoreProduct(product, terms) {
    const text = productText(product);
    let score = 0;

    terms.forEach((term) => {
        const normalizedTerm = normalize(term);
        if (!normalizedTerm) return;
        if (normalize(product.code).includes(normalizedTerm)) score += 8;
        if (normalize(product.name).includes(normalizedTerm)) score += 7;
        if (normalize(product.type).includes(normalizedTerm)) score += 5;
        if (text.includes(normalizedTerm)) score += 2;
    });

    return score;
}

function findRelevantProducts(catalog, message, limit = 4) {
    const terms = expandQuery(message);
    return publicCatalog(catalog)
        .map((product) => ({ product, score: scoreProduct(product, terms) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.product);
}

function productUrl(product) {
    return `produto-detalhe.html?produto=${encodeURIComponent(product.code || product.name)}`;
}

function quoteUrl(product) {
    return `suporte.html?produto=${encodeURIComponent(product.name || product.code || '')}`;
}

function buildActions(products) {
    const actions = [];
    if (products[0]) {
        actions.push({
            label: 'Ir para página do item',
            url: productUrl(products[0]),
            type: 'detail'
        });
        actions.push({
            label: 'Fechar compra',
            url: quoteUrl(products[0]),
            type: 'quote'
        });
    } else {
        actions.push({
            label: 'Falar com a equipe técnica',
            url: 'suporte.html',
            type: 'support'
        });
    }
    actions.push({
        label: 'Ver catálogo',
        url: 'produtos.html',
        type: 'catalog'
    });
    return actions;
}

function compactProduct(product) {
    const specs = product.specs || {};
    return {
        name: product.name,
        code: product.code,
        family: product.family,
        type: product.type,
        description: product.description,
        pdf: product.pdf || '',
        detailUrl: productUrl(product),
        quoteUrl: quoteUrl(product),
        specs: {
            taxa: specs.Taxa || '',
            alcance: specs.Alcance || '',
            conector: specs.Conector || specs.Interface || '',
            fibra: specs.Fibra || '',
            comprimentoDeOnda: specs['Comprimento de onda'] || ''
        }
    };
}

function fallbackReply(message, matches) {
    if (matches.length > 0) {
        const primary = matches[0];
        const specs = primary.specs || {};
        const alternatives = matches.slice(1, 3).map((item) => item.name).join(', ');
        return [
            `Pelo que você descreveu, o item mais próximo é o ${primary.name}.`,
            `${primary.type}. ${primary.description}`,
            `Principais dados: taxa ${specs.Taxa || 'sob consulta'}, alcance ${specs.Alcance || 'sob consulta'}, conector ${specs.Conector || specs.Interface || 'sob consulta'}.`,
            alternatives ? `Também encontrei opções próximas: ${alternatives}.` : '',
            'Você pode abrir a página do item para conferir as especificações ou seguir para a solicitação de compra.'
        ].filter(Boolean).join(' ');
    }

    return [
        'Não encontrei um produto exato no catálogo SFP/QSFP com essa descrição.',
        'Você pode informar velocidade, alcance, tipo de fibra, conector ou se precisa de BiDi/RJ45.',
        'Se preferir, fale com a equipe técnica da TOR para auxiliar na escolha do produto ideal.'
    ].join(' ');
}

function buildSystemPrompt(matches) {
    const productContext = matches.map((product, index) => {
        const specs = product.specs || {};
        return [
            `Produto ${index + 1}: ${product.name}`,
            `Codigo: ${product.code}`,
            `Familia: ${product.family}`,
            `Tipo: ${product.type}`,
            `Descricao: ${product.description}`,
            `Taxa: ${specs.Taxa || 'sob consulta'}`,
            `Alcance: ${specs.Alcance || 'sob consulta'}`,
            `Conector/interface: ${specs.Conector || specs.Interface || 'sob consulta'}`,
            `Fibra: ${specs.Fibra || 'sob consulta'}`,
            `Pagina: ${productUrl(product)}`,
            `Compra/cotacao: ${quoteUrl(product)}`
        ].join('\n');
    }).join('\n\n');

    return [
        'Voce e o assistente comercial e tecnico da TOR Tecnologia.',
        'Responda sempre em portugues do Brasil, com tom objetivo, educado e comercial.',
        'A TOR fabrica equipamentos de telecomunicacoes. O catalogo publico atual deve recomendar somente produtos das familias SFP e QSFP.',
        'Nao diga que a TOR analisa edital, proposta ou processo. O comprador normalmente ja sabe a demanda; voce auxilia na escolha do produto TOR adequado.',
        'Explique o processo quando perguntarem: escolher o modelo, abrir a pagina do item, conferir especificacoes/datasheet e enviar solicitacao de compra/cotacao pelo formulario.',
        'Se nao houver produto compativel no contexto, peca velocidade, alcance, fibra, conector e aplicacao. Nao invente produtos.',
        'Quando recomendar produto, cite no maximo 3 opcoes e destaque a melhor primeira.',
        productContext ? `Contexto recuperado do catalogo:\n${productContext}` : 'Contexto recuperado do catalogo: nenhum produto encontrado.'
    ].join('\n');
}

async function askGroq(message, matches) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            temperature: 0.2,
            max_tokens: 500,
            messages: [
                { role: 'system', content: buildSystemPrompt(matches) },
                { role: 'user', content: message }
            ]
        })
    });

    if (!response.ok) {
        throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json();
    return data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;
}

async function buildAssistantResponse(catalog, message) {
    const cleanMessage = String(message || '').trim().slice(0, 1000);
    const matches = findRelevantProducts(catalog, cleanMessage);
    let reply = null;
    let source = 'fallback';

    try {
        reply = await askGroq(cleanMessage, matches);
        if (reply) source = 'groq';
    } catch (error) {
        reply = null;
    }

    if (!reply) reply = fallbackReply(cleanMessage, matches);

    return {
        reply,
        source,
        products: matches.map(compactProduct),
        actions: buildActions(matches)
    };
}

module.exports = {
    buildAssistantResponse,
    findRelevantProducts,
    publicCatalog
};
