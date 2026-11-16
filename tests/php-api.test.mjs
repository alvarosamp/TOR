import assert from 'node:assert/strict';
import { mkdtemp, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';

export const password = 'temporary-test-password';
export const config = { admins: [{ email: 'admin@example.com', hash: bcrypt.hashSync(password, 4) }] };
export async function verify(request) {
    assert.equal((await request('/api/health')).data.service, 'tor-site-php');
    assert.equal((await request('/api/admin/tickets')).status, 401);
    assert.equal((await request('/api/quote', {})).status, 400);
    const payload = { name: 'Teste', email: 'cliente@example.com', requestType: 'Suporte técnico', subject: 'falha em switch', message: 'Mensagem de teste', product: 'Switch TOR', quantity: '2', segment: 'Governo', deadline: '30 dias', lgpdConsent: 'sim' };
    assert.equal((await request('/api/quote', {...payload, lgpdConsent:'false'})).status, 400);
    const result = await request('/api/quote', payload);
    assert.equal(result.status, 201);
    assert.equal(result.data.ok, true);
    assert.equal(result.data.emailSent, false);
    assert.equal((await request('/api/login', {email:config.admins[0].email,password:'wrong'})).status, 401);
    assert.equal((await request('/api/login', {email:config.admins[0].email,password})).status, 200);
    assert.equal((await request('/api/me')).data.user.isAdmin, true);
    const {tickets} = (await request('/api/admin/tickets')).data;
    assert.equal(tickets.length, 1);
    assert.equal(tickets[0].status, 'novo');
    assert.equal(tickets[0].subject, '[Suporte técnico] falha em switch');
    assert.equal(tickets[0].emailFalhou, true);
    assert.match(tickets[0].message, /Produto: Switch TOR\nQuantidade: 2\nSegmento: Governo\nPrazo: 30 dias/);
    assert.equal((await request('/api/leads')).data.leads.length, 1);
    assert.equal((await request(`/api/admin/tickets/${tickets[0].id}/reply`, {reply:'Recebido'})).status, 200);
    assert.equal((await request('/api/admin/tickets')).data.tickets[0].status, 'respondido');
    await request('/api/logout', {});
    assert.equal((await request('/api/admin/tickets')).status, 401);
    console.log('PHP API: validação, gravação, falha de e-mail, login, chamados, resposta e logout OK.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const root = await mkdtemp(join(tmpdir(), 'tor-api-'));
    let server;
    try {
        await copyFile('api.php', join(root, 'api.php'));
        await writeFile(join(root, 'tor-config.php'), `<?php return json_decode(base64_decode('${Buffer.from(JSON.stringify(config)).toString('base64')}'),true);`);
        server = spawn('php', ['-d', 'disable_functions=mail', '-S', '127.0.0.1:18763', '-t', root], {stdio:'ignore'});
        let ready = false;
        for(let i=0; i<100; i++) { try { await fetch('http://127.0.0.1:18763/api.php?r=/api/health'); ready=true; break; } catch { await new Promise(r=>setTimeout(r,50)); } }
        assert.ok(ready, 'Servidor PHP não iniciou');
        let cookie = '';
        await verify(async (route, body) => {
            const response = await fetch(`http://127.0.0.1:18763/api.php?r=${encodeURIComponent(route)}`, {method:body ? 'POST':'GET', headers:{'Content-Type':'application/json',Cookie:cookie}, body:body ? JSON.stringify(body):undefined});
            if(response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
            return {status:response.status, data:await response.json()};
        });
    } finally { server?.kill(); await rm(root,{recursive:true,force:true}); }
}
