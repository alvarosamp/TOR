const http = require('http');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.RELAY_TOKEN || '';
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN || 30);
const MAX_BODY = 200 * 1024;
const DRY_RUN = process.env.MAIL_DRY_RUN === 'true';
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

if (TOKEN.length < 24) {
    console.error('RELAY_TOKEN ausente ou curto demais (mínimo 24 caracteres).');
    process.exit(1);
}

function buildTransport() {
    if (DRY_RUN) return nodemailer.createTransport({ jsonTransport: true });
    const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('SMTP não configurado (SMTP_HOST/SMTP_USER/SMTP_PASS): /send responderá 503 até configurar.');
        return null;
    }
    const port = Number(process.env.SMTP_PORT || 465);
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 10000,
        socketTimeout: 20000
    });
}

const transport = buildTransport();
const FROM = process.env.MAIL_FROM || `"Site TOR Tecnologia" <${process.env.SMTP_USER || 'site@localhost'}>`;

const hits = [];
function rateLimited() {
    const now = Date.now();
    while (hits.length && now - hits[0] > 60000) hits.shift();
    if (hits.length >= RATE_LIMIT) return true;
    hits.push(now);
    return false;
}

function authorized(req) {
    const header = req.headers.authorization || '';
    const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
    const expected = Buffer.from(TOKEN);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function send(res, status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY) { reject(Object.assign(new Error('payload'), { status: 413 })); req.destroy(); return; }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

const oneLine = (v, max) => String(v || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

const server = http.createServer(async (req, res) => {
    try {
        if (req.method === 'GET' && req.url === '/health') return send(res, 200, { status: 'ok', service: 'tor-mail-relay' });

        if (req.method === 'POST' && req.url === '/send') {
            if (!authorized(req)) return send(res, 401, { error: 'Não autorizado.' });
            if (!transport) return send(res, 503, { error: 'SMTP não configurado no relay.' });
            if (rateLimited()) return send(res, 429, { error: 'Limite de envios por minuto atingido.' });

            let payload;
            try { payload = JSON.parse(await readBody(req)); } catch (e) {
                return send(res, e.status || 400, { error: e.status === 413 ? 'Mensagem grande demais.' : 'JSON inválido.' });
            }

            const to = oneLine(payload.to, 200);
            const replyTo = oneLine(payload.replyTo, 200);
            const subject = oneLine(payload.subject, 250);
            if (!EMAIL_RE.test(to)) return send(res, 400, { error: 'Destinatário inválido.' });
            if (replyTo && !EMAIL_RE.test(replyTo)) return send(res, 400, { error: 'Reply-To inválido.' });
            if (!subject || !payload.text) return send(res, 400, { error: 'Informe assunto e texto.' });

            const info = await transport.sendMail({
                from: FROM,
                to,
                replyTo: replyTo || undefined,
                subject,
                text: String(payload.text).slice(0, 50000),
                html: payload.html ? String(payload.html).slice(0, 100000) : undefined
            });
            console.log(`[send] ok to=${to} id=${info.messageId || '-'}`);
            return send(res, 200, { ok: true, messageId: info.messageId || null });
        }

        send(res, 404, { error: 'Rota não encontrada.' });
    } catch (error) {
        console.error('[send] falha:', error.message);
        send(res, 502, { error: 'Falha ao enviar pelo SMTP.' });
    }
});

server.listen(PORT, () => console.log(`tor-mail-relay ouvindo em :${PORT}${DRY_RUN ? ' (dry-run)' : ''}`));
module.exports = server;
