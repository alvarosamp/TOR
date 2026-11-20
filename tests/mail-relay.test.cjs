const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { mkdtempSync, copyFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const TOKEN = 'token-de-teste-com-mais-de-24-caracteres';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn) { for (let i = 0; i < 100; i++) { try { return await fn(); } catch { await wait(50); } } throw new Error('timeout'); }

(async () => {
    // 1) Relay real em dry-run (sem SMTP): autenticação, validação e envio.
    const relayDir = path.join(__dirname, '..', 'mail-relay');
    const relay = spawn('node', ['server.js'], { cwd: relayDir, stdio: 'ignore', env: { ...process.env, PORT: '18771', RELAY_TOKEN: TOKEN, MAIL_DRY_RUN: 'true' } });
    // 2) Relay falso para capturar o que o PHP envia.
    const received = [];
    const fake = http.createServer((req, res) => {
        let b = ''; req.on('data', (c) => b += c); req.on('end', () => {
            received.push({ auth: req.headers.authorization, body: JSON.parse(b) });
            res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
        });
    }).listen(18772);
    const root = mkdtempSync(path.join(tmpdir(), 'tor-relay-'));
    let php;
    try {
        const post = (headers, body) => fetch('http://127.0.0.1:18771/send', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
        await until(() => fetch('http://127.0.0.1:18771/health'));
        const ok = { to: 'governo@tor.tec.br', subject: 'Teste', text: 'oi', replyTo: 'c@x.com' };
        assert.equal((await post({}, ok)).status, 401);
        assert.equal((await post({ Authorization: 'Bearer errado' }, ok)).status, 401);
        assert.equal((await post({ Authorization: `Bearer ${TOKEN}` }, { ...ok, to: 'invalido' })).status, 400);
        assert.equal((await post({ Authorization: `Bearer ${TOKEN}` }, { ...ok, subject: '' })).status, 400);
        assert.equal((await post({ Authorization: `Bearer ${TOKEN}` }, ok)).status, 200);

        // 3) PHP usando o relay (mail() desativado: só o relay pode entregar).
        copyFileSync(path.join(__dirname, '..', 'api.php'), path.join(root, 'api.php'));
        const cfg = { admins: [], relay_url: 'http://127.0.0.1:18772', relay_token: 'abc' };
        writeFileSync(path.join(root, 'tor-config.php'), `<?php return json_decode(base64_decode('${Buffer.from(JSON.stringify(cfg)).toString('base64')}'),true);`);
        php = spawn('php', ['-d', 'disable_functions=mail', '-S', '127.0.0.1:18773', '-t', root], { stdio: 'ignore' });
        await until(() => fetch('http://127.0.0.1:18773/api.php?r=/api/health'));
        const r = await fetch('http://127.0.0.1:18773/api.php?r=/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Teste', email: 'cliente@example.com', requestType: 'Suporte técnico', subject: 'falha em switch', message: 'msg', lgpdConsent: 'sim' }) });
        const data = await r.json();
        assert.equal(r.status, 201);
        assert.equal(data.emailSent, true);
        assert.equal(data.emailCopySent, true);
        assert.equal(received.length, 2);
        assert.equal(received[0].auth, 'Bearer abc');
        assert.equal(received[0].body.to, 'governo@tor.tec.br');
        assert.equal(received[0].body.replyTo, 'cliente@example.com');
        assert.match(received[0].body.subject, /^\[Site TOR\] Suporte técnico — falha em switch/);
        assert.equal(received[1].body.to, 'cliente@example.com');
        console.log('Relay de e-mail: autenticação, validação, envio e integração PHP OK.');
    } finally { relay.kill(); php?.kill(); fake.close(); rmSync(root, { recursive: true, force: true }); }
})().catch((e) => { console.error(e); process.exit(1); });
