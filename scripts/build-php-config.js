const fs = require('fs');
const bcrypt = require('bcryptjs');
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (Boolean(email) !== Boolean(password)) throw new Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD juntos.');
const relayUrl = (process.env.MAIL_RELAY_URL || '').trim();
const relayToken = (process.env.MAIL_RELAY_TOKEN || '').trim();
if (Boolean(relayUrl) !== Boolean(relayToken)) throw new Error('Configure MAIL_RELAY_URL e MAIL_RELAY_TOKEN juntos.');
if (relayUrl && !/^https:\/\//.test(relayUrl)) throw new Error('MAIL_RELAY_URL deve usar https://.');
const config = { admins: email && password ? [{ email, name: 'Administrador TOR', hash: bcrypt.hashSync(password, 10) }] : [] };
if (relayUrl) { config.relay_url = relayUrl; config.relay_token = relayToken; }
const encoded = Buffer.from(JSON.stringify(config)).toString('base64');
fs.writeFileSync('dist/tor-config.php', `<?php\nreturn json_decode(base64_decode('${encoded}'), true);\n`);
if (!config.admins.length) console.warn('Login PHP desativado: configure ADMIN_EMAIL e ADMIN_PASSWORD nos Secrets. As solicitações serão salvas.');
if (!relayUrl) console.warn('Relay de e-mail desativado: configure MAIL_RELAY_URL e MAIL_RELAY_TOKEN. O PHP usará mail().');
