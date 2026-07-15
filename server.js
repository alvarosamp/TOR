const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const vm = require('vm');

const app = express();
const PORT = Number(process.env.PORT || 8765);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

async function ensureDataFiles() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(LEADS_FILE);
    } catch {
        await fs.writeFile(LEADS_FILE, '[]\n', 'utf8');
    }
}

async function readCatalog() {
    const catalogSource = await fs.readFile(path.join(ROOT, 'catalog-data.js'), 'utf8');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(catalogSource, sandbox, { timeout: 1000 });
    return sandbox.window.TOR_CATALOG_PRODUCTS || [];
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
        'source'
    ];

    allowedFields.forEach((field) => {
        const value = payload[field];
        clean[field] = typeof value === 'string' ? value.trim().slice(0, 2000) : value || '';
    });

    return clean;
}

function validateLead(lead) {
    const required = ['name', 'email', 'requestType', 'subject', 'message'];
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

app.get('/api/leads', async (req, res, next) => {
    try {
        const token = req.get('x-admin-token');
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
            res.status(401).json({ error: 'Acesso não autorizado.' });
            return;
        }

        const leads = JSON.parse(await fs.readFile(LEADS_FILE, 'utf8'));
        res.json({ total: leads.length, leads });
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
