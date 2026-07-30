const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const vm = require('vm');
const { PDFParse } = require('pdf-parse');
const { buildAssistantResponse } = require('./lib/catalog-assistant');

const app = express();
const PORT = Number(process.env.PORT || 8765);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog-products.json');
const SITE_SETTINGS_FILE = path.join(DATA_DIR, 'site-settings.json');
const CATALOG_VERSIONS_FILE = path.join(DATA_DIR, 'catalog-versions.json');
const DATASHEETS_DIR = path.join(ROOT, 'assets', 'datasheets');

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

async function ensureDataFiles() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(LEADS_FILE);
    } catch {
        await fs.writeFile(LEADS_FILE, '[]\n', 'utf8');
    }
    try {
        await fs.access(SITE_SETTINGS_FILE);
    } catch {
        await fs.writeFile(SITE_SETTINGS_FILE, JSON.stringify({
            email: 'governo@tor.tec.br',
            phone: '0800 000 5978',
            linkedin: 'https://www.linkedin.com/company/tor-tecnologia-e-industria/',
            instagram: 'https://www.instagram.com/tor.tec/'
        }, null, 2) + '\n', 'utf8');
    }
    try {
        await fs.access(CATALOG_VERSIONS_FILE);
    } catch {
        await fs.writeFile(CATALOG_VERSIONS_FILE, '[]\n', 'utf8');
    }
    await fs.mkdir(DATASHEETS_DIR, { recursive: true });
}

async function readCatalog() {
    try {
        const savedCatalog = JSON.parse(await fs.readFile(CATALOG_FILE, 'utf8'));
        if (Array.isArray(savedCatalog)) return savedCatalog;
    } catch {
        // Fallback to versioned catalog-data.js when there is no admin override.
    }
    const catalogSource = await fs.readFile(path.join(ROOT, 'catalog-data.js'), 'utf8');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(catalogSource, sandbox, { timeout: 1000 });
    return sandbox.window.TOR_CATALOG_PRODUCTS || [];
}

function requireAdmin(req, res, next) {
    const expected = process.env.ADMIN_TOKEN || 'tor-admin-local';
    const token = req.get('x-admin-token') || req.query.token;
    if (token !== expected) {
        res.status(401).json({ error: 'Acesso administrativo não autorizado.' });
        return;
    }
    next();
}

function cleanCode(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9+._-]/g, '');
}

function cleanFileName(value) {
    return path.basename(String(value || 'datasheet.pdf')).replace(/[^a-zA-Z0-9+._-]/g, '-');
}

function timestampVersion() {
    return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function normalizeProduct(payload, pdfPath) {
    const product = payload || {};
    const code = cleanCode(product.code || product.name);
    const specs = product.specs && typeof product.specs === 'object' ? product.specs : {};

    return {
        name: String(product.name || code).trim(),
        code,
        category: String(product.category || 'transceivers').trim(),
        family: String(product.family || (code.includes('QSFP') ? 'QSFP' : 'SFP')).trim(),
        type: String(product.type || 'Transceptor óptico TOR').trim(),
        datasheetStatus: String(product.datasheetStatus || 'Datasheet TOR revisado').trim(),
        statusClass: String(product.statusClass || 'tor').trim(),
        pdf: pdfPath || String(product.pdf || '').trim(),
        description: String(product.description || '').trim(),
        specs
    };
}

function firstMatch(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match;
    }
    return null;
}

function inferProductFromDatasheet(buffer, fileName, provided = {}) {
    const parser = new PDFParse({ data: buffer });
    return parser.getText().catch(() => ({ text: '' })).then(({ text }) => {
        const source = `${fileName}\n${text || ''}`;
        const upperSource = source.toUpperCase();
        const specSource = String(text || '').toUpperCase();
        const baseName = cleanCode(path.basename(fileName, path.extname(fileName)).replace(/-OK$/i, ''));
        const codeMatch = firstMatch(upperSource, [
            /\b(QSFP[0-9A-Z._+-]{4,40})\b/,
            /\b(SFPX[0-9A-Z._+-]{4,40})\b/,
            /\b(SFP[0-9A-Z._+-]{4,40})\b/
        ]);
        const code = cleanCode(provided.code || (codeMatch && codeMatch[1]) || baseName);
        const family = provided.family || (code.includes('QSFP') ? 'QSFP' : 'SFP');
        const isElectrical = /RJ-?45|BASE-T|COPPER|COBRE/.test(specSource) || code.includes('RJ45');
        const isBidi = /BIDI|BI-DI|TX\s*\d+\s*\/\s*RX\s*\d+/.test(specSource) || /(3155|5531|2733|3327)/.test(code);
        const isSr = /SR|850\s*NM/.test(specSource) || code.includes('850');
        const isLr = /LR|1310\s*NM/.test(specSource) || code.includes('LR');

        const speedMatch = firstMatch(specSource, [
            /(\d+(?:[.,]\d+)?)\s*(?:GBPS|GB\/S|GBASE|G\b)/,
            /(10GBASE-T)/,
            /(1000BASE-T)/
        ]);
        let rate = provided.rate || '';
        if (!rate && speedMatch) {
            if (String(speedMatch[1]).includes('10GBASE')) rate = '10GBASE-T';
            else if (String(speedMatch[1]).includes('1000BASE')) rate = '1,25 Gb/s';
            else rate = `${String(speedMatch[1]).replace('.', ',')} Gb/s`;
        }
        if (!rate && code.includes('10G')) rate = '10 Gb/s';
        if (!rate && code.includes('1G')) rate = '1,25 Gb/s';
        if (!rate && code.includes('40G')) rate = '40 Gb/s';
        if (!rate && code.includes('100G')) rate = '100 Gb/s';

        const reachMatch = firstMatch(specSource, [
            /(\d+(?:[.,]\d+)?)\s*(KM|M)\b/,
            /(\d+(?:[.,]\d+)?)(KM|M)\b/
        ]);
        let reach = provided.reach || '';
        if (!reach && reachMatch) reach = `${String(reachMatch[1]).replace('.', ',')} ${reachMatch[2].toLowerCase()}`;

        const txRxMatch = firstMatch(specSource, [/TX\s*([0-9]{4})\s*NM?\s*\/\s*RX\s*([0-9]{4})\s*NM?/]);
        const wavelengthMatch = firstMatch(specSource, [/([0-9]{3,4})\s*NM/]);
        let wavelength = provided.wavelength || '';
        if (!wavelength && txRxMatch) wavelength = `Tx${txRxMatch[1]} / Rx${txRxMatch[2]} nm`;
        if (!wavelength && wavelengthMatch) wavelength = `${wavelengthMatch[1]} nm`;

        let connector = provided.connector || '';
        if (!connector) {
            if (isElectrical) connector = 'RJ45';
            else if (isBidi) connector = 'Simplex LC/UPC';
            else if (/MPO|MTP/.test(specSource)) connector = 'MPO/MTP';
            else connector = 'Duplex LC/UPC';
        }

        let fiberOrCable = provided.fiber || '';
        if (!fiberOrCable) {
            if (isElectrical) fiberOrCable = /CAT\s*7|CAT7/.test(specSource) ? 'Cat6A/Cat7' : 'Cat 5';
            else if (/MMF|MULTIMODE|MULTIMODO|850\s*NM/.test(specSource)) fiberOrCable = 'MMF';
            else fiberOrCable = 'SMF';
        }

        let type = provided.type || '';
        if (!type) {
            if (isElectrical) type = family === 'SFP' ? 'Transceptor SFP RJ45' : 'Transceptor RJ45';
            else if (isBidi) type = family === 'SFP' ? 'Transceptor SFP BiDi' : 'Transceptor QSFP BiDi';
            else if (isSr) type = family === 'SFP' ? 'Transceptor SFP SR' : 'Transceptor QSFP SR';
            else if (isLr) type = family === 'SFP' ? 'Transceptor SFP LR' : 'Transceptor QSFP LR';
            else type = family === 'SFP' ? 'Transceptor SFP' : 'Transceptor QSFP';
        }

        const specs = {
            Taxa: rate,
            Alcance: reach,
            'Comprimento de onda': wavelength,
            DDM: /DDM|DOM|MONITOR/.test(specSource) ? 'Sim' : 'Sim',
            Temperatura: provided.temperature || '0 °C a +70 °C'
        };
        specs[isElectrical ? 'Interface' : 'Conector'] = connector;
        specs[isElectrical ? 'Cabo' : 'Fibra'] = fiberOrCable;
        Object.keys(specs).forEach((key) => {
            if (!specs[key]) delete specs[key];
        });

        const description = provided.description || (isElectrical
            ? `${type} com interface RJ45 para aplicações Ethernet em cobre.`
            : isBidi && txRxMatch
                ? `${type} para enlaces monomodo, transmissão em ${txRxMatch[1]} nm e recepção em ${txRxMatch[2]} nm.`
                : `${type} ${wavelength ? `${wavelength}, ` : ''}para enlaces ${fiberOrCable === 'MMF' ? 'multimodo' : 'monomodo'}${reach ? ` de até ${reach}` : ''}.`);

        return normalizeProduct({
            ...provided,
            name: provided.name || code,
            code,
            category: provided.category || (family === 'SFP' || family === 'QSFP' ? 'transceivers' : 'outros'),
            family,
            type,
            datasheetStatus: 'Datasheet TOR revisado',
            statusClass: 'tor',
            description,
            specs
        });
    });
}

async function writeCatalog(products) {
    await ensureDataFiles();
    await fs.writeFile(CATALOG_FILE, JSON.stringify(products, null, 2) + '\n', 'utf8');
}

async function appendCatalogVersion(entry) {
    await ensureDataFiles();
    const versions = JSON.parse(await fs.readFile(CATALOG_VERSIONS_FILE, 'utf8'));
    versions.unshift(entry);
    await fs.writeFile(CATALOG_VERSIONS_FILE, JSON.stringify(versions.slice(0, 500), null, 2) + '\n', 'utf8');
}

function sanitizeLead(payload) {
    const clean = {};
    const allowedFields = [
        'name',
        'organization',
        'email',
        'phone',
        'requestType',
        'product',
        'quantity',
        'segment',
        'deadline',
        'subject',
        'message',
        'lgpdConsent',
        'source'
    ];

    allowedFields.forEach((field) => {
        const value = payload[field];
        clean[field] = typeof value === 'string' ? value.trim().slice(0, 2000) : value || '';
    });

    return clean;
}

function validateLead(lead) {
    const required = ['name', 'email', 'requestType', 'subject', 'message', 'lgpdConsent'];
    const missing = required.filter((field) => !lead[field]);
    if (missing.length > 0) {
        return `Campos obrigatórios ausentes: ${missing.join(', ')}`;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
        return 'E-mail inválido.';
    }

    return null;
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'tor-site', timestamp: new Date().toISOString() });
});

app.get('/api/catalog', async (req, res, next) => {
    try {
        const catalog = await readCatalog();
        res.json({ total: catalog.length, products: catalog });
    } catch (error) {
        next(error);
    }
});

app.get('/api/catalog/:code', async (req, res, next) => {
    try {
        const catalog = await readCatalog();
        const product = catalog.find((item) => (
            String(item.code).toLowerCase() === req.params.code.toLowerCase()
            || String(item.name).toLowerCase() === req.params.code.toLowerCase()
        ));

        if (!product) {
            res.status(404).json({ error: 'Produto não encontrado.' });
            return;
        }

        res.json(product);
    } catch (error) {
        next(error);
    }
});

app.post('/api/quote', async (req, res, next) => {
    try {
        await ensureDataFiles();
        const lead = sanitizeLead(req.body || {});
        const validationError = validateLead(lead);

        if (validationError) {
            res.status(400).json({ error: validationError });
            return;
        }

        const record = {
            id: `lead_${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'novo',
            ...lead
        };

        const current = JSON.parse(await fs.readFile(LEADS_FILE, 'utf8'));
        current.push(record);
        await fs.writeFile(LEADS_FILE, `${JSON.stringify(current, null, 2)}\n`, 'utf8');

        res.status(201).json({
            ok: true,
            id: record.id,
            message: 'Solicitação recebida. A equipe TOR entrará em contato.'
        });
    } catch (error) {
        next(error);
    }
});

app.post('/api/chat', async (req, res, next) => {
    try {
        const message = String((req.body || {}).message || '').trim();
        if (!message) {
            res.status(400).json({ error: 'Envie uma mensagem para o assistente.' });
            return;
        }

        const catalog = await readCatalog();
        const response = await buildAssistantResponse(catalog, message);
        res.json(response);
    } catch (error) {
        next(error);
    }
});

app.get('/api/leads', requireAdmin, async (req, res, next) => {
    try {
        await ensureDataFiles();
        const leads = JSON.parse(await fs.readFile(LEADS_FILE, 'utf8'));
        res.json({ total: leads.length, leads });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/catalog', requireAdmin, async (req, res, next) => {
    try {
        const catalog = await readCatalog();
        res.json({ total: catalog.length, products: catalog });
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/catalog', requireAdmin, async (req, res, next) => {
    try {
        if (!Array.isArray(req.body.products)) {
            res.status(400).json({ error: 'Envie { products: [...] }.' });
            return;
        }
        await writeCatalog(req.body.products);
        await appendCatalogVersion({
            id: `catalog_${Date.now()}`,
            createdAt: new Date().toISOString(),
            action: 'catalog_replace',
            total: req.body.products.length
        });
        res.json({ ok: true, total: req.body.products.length });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/catalog/versions', requireAdmin, async (req, res, next) => {
    try {
        await ensureDataFiles();
        const versions = JSON.parse(await fs.readFile(CATALOG_VERSIONS_FILE, 'utf8'));
        res.json({ total: versions.length, versions });
    } catch (error) {
        next(error);
    }
});

app.post('/api/admin/products/datasheet', requireAdmin, async (req, res, next) => {
    try {
        await ensureDataFiles();
        const payload = req.body || {};
        const file = payload.file || {};

        if (!file.contentBase64 || !String(file.name || '').toLowerCase().endsWith('.pdf')) {
            res.status(400).json({ error: 'Envie um datasheet em PDF.' });
            return;
        }

        const originalName = cleanFileName(file.name);
        const buffer = Buffer.from(String(file.contentBase64).replace(/^data:application\/pdf;base64,/, ''), 'base64');

        if (!buffer.length || buffer.slice(0, 4).toString('utf8') !== '%PDF') {
            res.status(400).json({ error: 'O arquivo enviado não parece ser um PDF válido.' });
            return;
        }

        const inferredProduct = await inferProductFromDatasheet(buffer, originalName, payload.product || {});
        const code = cleanCode(inferredProduct.code || inferredProduct.name);

        if (!code) {
            res.status(400).json({ error: 'Não consegui identificar o PN do produto no PDF. Renomeie o arquivo com o PN ou informe o código opcional.' });
            return;
        }

        const version = timestampVersion();
        const versionedName = `${code}-v${version}.pdf`;
        const versionedAbs = path.join(DATASHEETS_DIR, versionedName);
        await fs.writeFile(versionedAbs, buffer);

        const pdfPath = `assets/datasheets/${versionedName}`;
        const product = normalizeProduct(inferredProduct, pdfPath);
        const catalog = await readCatalog();
        const existingIndex = catalog.findIndex((item) => (
            cleanCode(item.code) === code || cleanCode(item.name) === code
        ));
        const previous = existingIndex >= 0 ? catalog[existingIndex] : null;

        if (existingIndex >= 0) {
            catalog[existingIndex] = product;
        } else {
            catalog.unshift(product);
        }

        await writeCatalog(catalog);
        const versionEntry = {
            id: `product_${code}_${version}`,
            createdAt: new Date().toISOString(),
            action: previous ? 'product_update' : 'product_create',
            code,
            version,
            pdf: pdfPath,
            originalFileName: originalName,
            previousPdf: previous ? previous.pdf || '' : '',
            product
        };
        await appendCatalogVersion(versionEntry);

        res.status(201).json({
            ok: true,
            action: versionEntry.action,
            version,
            product,
            pdf: pdfPath
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/admin/settings', requireAdmin, async (req, res, next) => {
    try {
        await ensureDataFiles();
        res.json(JSON.parse(await fs.readFile(SITE_SETTINGS_FILE, 'utf8')));
    } catch (error) {
        next(error);
    }
});

app.put('/api/admin/settings', requireAdmin, async (req, res, next) => {
    try {
        await ensureDataFiles();
        const allowed = ['email', 'phone', 'linkedin', 'instagram'];
        const settings = {};
        allowed.forEach((key) => {
            settings[key] = String(req.body[key] || '').trim();
        });
        await fs.writeFile(SITE_SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf8');
        res.json({ ok: true, settings });
    } catch (error) {
        next(error);
    }
});

app.post('/api/telegram/webhook', (req, res) => {
    // Ponto inicial para integrar um bot real do Telegram depois que houver token e webhook configurados.
    res.json({
        ok: true,
        message: 'Webhook recebido. Configure TELEGRAM_BOT_TOKEN para ativar respostas automáticas reais.'
    });
});

app.use(express.static(ROOT, {
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        if (/\.(css|js|png|jpg|jpeg|gif|ico|svg|webp|pdf|xml|txt)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000');
        }
    }
}));

app.get('*', (req, res) => {
    res.sendFile(path.join(ROOT, 'index.html'));
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
});

ensureDataFiles().then(() => {
    app.listen(PORT, () => {
        console.log(`TOR site running at http://localhost:${PORT}`);
    });
});
