const nodemailer = require('nodemailer');

// Destino padrão de todas as solicitações do site (formulário de suporte e chamados).
const SUPPORT_TO = process.env.SUPPORT_EMAIL_TO || 'governo@tor.tec.br';

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return transporter;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function oneLine(value, max = 120) {
    return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

function buildBody(title, fields, message) {
    const rows = fields.filter(([, v]) => v);
    const text = [
        title,
        '',
        ...rows.map(([k, v]) => `${k}: ${v}`),
        '',
        'Mensagem:',
        message || '',
        '',
        '— Enviado automaticamente pelo site TOR Tecnologia. Use o botão Responder para continuar o atendimento.'
    ].join('\n');

    const html = `
<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;max-width:640px">
  <h2 style="color:#0b3d91;margin:0 0 12px">${escapeHtml(title)}</h2>
  <table cellpadding="6" style="border-collapse:collapse;width:100%">
    ${rows.map(([k, v]) => `<tr><td style="background:#f2f4f8;font-weight:bold;width:180px;border:1px solid #dde2ea">${escapeHtml(k)}</td><td style="border:1px solid #dde2ea">${escapeHtml(v)}</td></tr>`).join('')}
  </table>
  <h3 style="margin:18px 0 6px">Mensagem</h3>
  <div style="white-space:pre-wrap;border:1px solid #dde2ea;padding:12px;background:#fafbfc">${escapeHtml(message)}</div>
  <p style="color:#666;font-size:12px;margin-top:18px">Enviado automaticamente pelo site TOR Tecnologia. Use o botão Responder para continuar o atendimento.</p>
</div>`;
    return { text, html };
}

async function send({ subject, replyTo, title, fields, message, to = SUPPORT_TO }) {
    const t = getTransporter();
    if (!t) {
        console.warn(`[mailer] SMTP não configurado — e-mail "${subject}" não enviado (registro salvo localmente).`);
        return { sent: false };
    }
    const { text, html } = buildBody(title, fields, message);
    try {
        await t.sendMail({
            from: process.env.SMTP_FROM || `"Site TOR Tecnologia" <${process.env.SMTP_USER}>`,
            to,
            replyTo,
            subject,
            text,
            html
        });
        return { sent: true };
    } catch (error) {
        console.error('[mailer] Falha ao enviar e-mail:', error.message);
        return { sent: false, error: error.message };
    }
}

function fmtDate(iso) {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Formulário público (suporte.html → /api/quote)
async function sendLeadEmail(lead) {
    const subject = `[Site TOR] ${oneLine(lead.requestType, 40)} — ${oneLine(lead.subject, 90)} — ${oneLine(lead.organization || lead.name, 60)}`;
    const details = {
        subject,
        replyTo: lead.email,
        title: `Nova solicitação: ${lead.requestType}`,
        fields: [
            ['Protocolo', lead.id],
            ['Recebido em', fmtDate(lead.createdAt)],
            ['Tipo de solicitação', lead.requestType],
            ['Assunto', lead.subject],
            ['Nome', lead.name],
            ['Organização', lead.organization],
            ['E-mail', lead.email],
            ['Telefone', lead.phone],
            ['Produto de interesse', lead.product],
            ['Quantidade', lead.quantity],
            ['Segmento', lead.segment],
            ['Prazo', lead.deadline],
            ['Origem', lead.source],
            ['Consentimento LGPD', lead.lgpdConsent ? 'Sim' : 'Não']
        ],
        message: lead.message
    };
    const original = await send(details);
    const copy = await send({ ...details, to: lead.email, replyTo: SUPPORT_TO, subject: `[TOR] Cópia da sua solicitação — ${oneLine(lead.subject, 90)}`, title: 'Cópia da sua solicitação' });
    return { ...original, copySent: copy.sent };
}

// Chamado aberto na área "Minha Conta" (→ /api/chamado)
function sendTicketEmail(ticket) {
    const subject = `[Chamado TOR #${ticket.id.replace('ticket_', '')}] ${oneLine(ticket.subject, 100)} — ${oneLine(ticket.organization || ticket.name, 60)}`;
    return send({
        subject,
        replyTo: ticket.email,
        title: 'Novo chamado de suporte (cliente logado)',
        fields: [
            ['Protocolo', ticket.id],
            ['Aberto em', fmtDate(ticket.createdAt)],
            ['Assunto', ticket.subject],
            ['Nome', ticket.name],
            ['Organização', ticket.organization],
            ['E-mail', ticket.email],
            ['Telefone', ticket.phone]
        ],
        message: ticket.message
    });
}

module.exports = { sendLeadEmail, sendTicketEmail, SUPPORT_TO };
