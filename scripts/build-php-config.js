const fs = require('fs');
const bcrypt = require('bcryptjs');
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (Boolean(email) !== Boolean(password)) throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD juntos.');
const config = { admins: email && password ? [{ email, name: 'Administrador TOR', hash: bcrypt.hashSync(password, 10) }] : [] };
const encoded = Buffer.from(JSON.stringify(config)).toString('base64');
fs.writeFileSync('dist/tor-config.php', `<?php\nreturn json_decode(base64_decode('${encoded}'), true);\n`);
if (!config.admins.length) console.warn('Login PHP desativado: configure ADMIN_EMAIL e ADMIN_PASSWORD nos Secrets. As solicitações serão salvas.');
