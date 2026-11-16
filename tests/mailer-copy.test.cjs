const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
(async () => {
    const sent = [];
    const context = { module:{exports:{}}, process:{env:{SMTP_HOST:'smtp.example.com',SMTP_USER:'site@example.com',SMTP_PASS:'test-only'}}, console,
        require:()=>({createTransport:()=>({sendMail:async(message)=>{sent.push(message); if(message.to==='governo@tor.tec.br') throw new Error('Falha simulada');}})}) };
    vm.runInNewContext(fs.readFileSync('lib/mailer.js','utf8'),context);
    const result=await context.module.exports.sendLeadEmail({id:'lead_test',createdAt:new Date().toISOString(),email:'cliente@example.com',name:'Cliente',subject:'Switch',requestType:'Suporte',message:'Mensagem de teste'});
    assert.equal(result.sent,false);
    assert.equal(result.copySent,true);
    assert.equal(sent.length,2);
    assert.equal(sent[0].to,'governo@tor.tec.br');
    assert.equal(sent[1].to,'cliente@example.com');
    assert.equal(sent[1].replyTo,'governo@tor.tec.br');
    assert.match(sent[1].text,/lead_test/);
    assert.match(sent[1].text,/Mensagem de teste/);
    console.log('E-mail: cópia independente ao solicitante, protocolo e Reply-To OK.');
})().catch(error=>{console.error(error);process.exitCode=1;});
