module.exports = function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido.' });
        return;
    }

    const payload = req.body || {};
    const required = ['name', 'email', 'requestType', 'subject', 'message'];
    const missing = required.filter((field) => !payload[field]);

    if (missing.length > 0) {
        res.status(400).json({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` });
        return;
    }

    res.status(201).json({
        ok: true,
        id: `lead_${Date.now()}`,
        message: 'Solicitação recebida. Para armazenamento definitivo na Vercel, conecte um banco ou serviço de e-mail.'
    });
};
