const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'web');

const copyDirs = ['assets', 'icons', 'en'];
const copyFiles = [
    'admin.html',
    'admin.js',
    'catalog-data.js',
    'catalog.js',
    'chatbot.js',
    'conteudo.html',
    'form-enhancements.js',
    'garantia.html',
    'index.html',
    'landing-licitacoes.html',
    'landing-transceivers.html',
    'landing-wifi-corporativo.html',
    'language.js',
    'navigation.js',
    'parceiros.html',
    'privacidade.html',
    'product-detail.js',
    'product-media.js',
    'product-questions.js',
    'produto-detalhe.html',
    'produto-duvidas.html',
    'produtos.html',
    'robots.txt',
    'script.js',
    'sitemap.xml',
    'sobre.html',
    'solucoes.html',
    'styles.css',
    'suporte.html',
    'trabalhe-conosco.html',
    'web.config'
];

const removeDir = (target) => {
    if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
    }
};

const copyDir = (source, target) => {
    if (!fs.existsSync(source)) return;
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
            copyDir(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    }
};

removeDir(outputDir);
fs.mkdirSync(outputDir, { recursive: true });

for (const file of copyFiles) {
    const source = path.join(root, file);
    if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(outputDir, file));
    }
}

for (const dir of copyDirs) {
    copyDir(path.join(root, dir), path.join(outputDir, dir));
}

const indexPath = path.join(outputDir, 'index.html');
if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, path.join(outputDir, 'default.htm'));
    fs.copyFileSync(indexPath, path.join(outputDir, 'default.html'));
}

console.log(`FTP web payload generated at ${outputDir}`);
