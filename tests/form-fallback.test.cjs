const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

async function submit(replies) {
    let submitHandler, feedback;
    let resets = 0;
    const button = {textContent:'Enviar', disabled:false};
    const form = {
        querySelector: (selector) => selector === 'button[type="submit"]' ? button : null,
        addEventListener: (type, fn) => { if(type==='submit') submitHandler=fn; },
        appendChild: (element) => { feedback = element; }, reset: () => resets++
    };
    const calls=[];
    vm.runInNewContext(fs.readFileSync('form-enhancements.js','utf8'), {
        window:{location:{search:'',pathname:'/suporte.html',href:'https://tor.tec.br/suporte.html'}},
        document:{getElementById:(id)=>id==='contactForm'?form:null,createElement:()=>({})},
        URLSearchParams,
        FormData: class {entries(){return Object.entries({name:'Teste',email:'test@example.com',lgpdConsent:'sim'});}},
        fetch:async (url)=>{
            if(url==='/api/me') return new Response('{"user":null}',{headers:{'content-type':'application/json'}});
            calls.push(url);
            const reply = replies.shift();
            if(reply instanceof Error) throw reply;
            return new Response(reply.body,{status:reply.status||200,headers:{'content-type':reply.type||'text/html'}});
        }
    });
    await submitHandler({preventDefault(){}});
    assert.equal(button.disabled,false);
    return {feedback,resets,calls};
}
(async()=>{
    let r=await submit([{body:'<!DOCTYPE html>'},{body:'{"ok":true,"id":"lead_123","message":"Recebida"}',status:201,type:'application/json'}]);
    assert.deepEqual(r.calls,['/api/quote','/api.php?r=/api/quote']);
    assert.match(r.feedback.textContent,/lead_123/);
    assert.equal(r.resets,1);
    r=await submit([{body:'<!DOCTYPE html>'},{body:'<!DOCTYPE html>'},{body:'<!DOCTYPE html>'}]);
    assert.match(r.feedback.textContent,/governo@tor.tec.br/);
    assert.doesNotMatch(r.feedback.textContent,/Unexpected token|DOCTYPE/);
    assert.equal(r.resets,0);
    r=await submit([{body:'{"error":"E-mail inválido"}',status:400,type:'application/json'}]);
    assert.equal(r.calls.length,1);
    assert.equal(r.feedback.textContent,'E-mail inválido');
    console.log('Formulário: fallback PHP, respostas HTML e validação OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
