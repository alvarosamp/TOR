const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildAssistantResponse } = require('../lib/catalog-assistant');

function readCatalog() {
    const catalogSource = fs.readFileSync(path.join(process.cwd(), 'catalog-data.js'), 'utf8');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(catalogSource, sandbox, { timeout: 1000 });
    return sandbox.window.TOR_CATALOG_PRODUCTS || [];
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Metodo nao permitido.' });
        return;
    }

    try {
        const message = String((req.body || {}).message || '').trim();
        if (!message) {
            res.status(400).json({ error: 'Envie uma mensagem para o assistente.' });
            return;
        }

        const catalog = readCatalog();
        const response = await buildAssistantResponse(catalog, message);
        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao consultar o assistente TOR.' });
    }
};
