const fs = require('fs');
const path = require('path');
const vm = require('vm');

function readCatalog() {
    const catalogSource = fs.readFileSync(path.join(process.cwd(), 'catalog-data.js'), 'utf8');
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(catalogSource, sandbox, { timeout: 1000 });
    return sandbox.window.TOR_CATALOG_PRODUCTS || [];
}

module.exports = function handler(req, res) {
    try {
        const catalog = readCatalog();
        res.status(200).json({ total: catalog.length, products: catalog });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar catálogo.' });
    }
};
