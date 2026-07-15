module.exports = function handler(req, res) {
    res.status(200).json({
        status: 'ok',
        service: 'tor-site',
        runtime: 'vercel',
        timestamp: new Date().toISOString()
    });
};
