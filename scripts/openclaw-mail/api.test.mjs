import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto, timingSafeEqual } from 'node:crypto';

// Load the real Pages handler without requiring a repository-wide module setting.
const source=await readFile(new URL('../../functions/api/bot-mail.js',import.meta.url),'utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const mailToken='fixture-private-mail-token',sendToken='fixture-private-resend-key';
const messageId='a'.repeat(64);

function fixture(t,{message,listResult}={}) {
  // Node lacks the Workers subtle.timingSafeEqual extension; use the native
  // constant-time primitive while preserving the handler's real digest/auth code.
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{subtle:{
    digest:webcrypto.subtle.digest.bind(webcrypto.subtle),
    timingSafeEqual:(a,b)=>timingSafeEqual(Buffer.from(a),Buffer.from(b)),
  }}});
  t.after(()=>Object.defineProperty(globalThis,'crypto',descriptor));
  const kvCalls=[],providerCalls=[],stored=new Map(message?[[`inbox:${messageId}`,message]]:[]);
  const env={OPENCLAW_MAIL_TOKEN:mailToken,RESEND_API_KEY:sendToken,OPENCLAW_MAIL:{
    async list(options){kvCalls.push({method:'list',options});return listResult||{keys:[],list_complete:true};},
    async get(key,type){kvCalls.push({method:'get',key,type});return stored.get(key)??null;},
    async put(key,value){kvCalls.push({method:'put',key});stored.set(key,JSON.parse(value));},
  }};
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    providerCalls.push({url,options,body:JSON.parse(options.body)});
    return Response.json({id:'fixture-provider-id'});
  });
  const request=async(path='',body,authorization='Bearer '+mailToken,overrideEnv=env)=>{
    const response=await onRequest({env:overrideEnv,request:new Request('https://mail.example/api/bot-mail'+path,{
      method:body===undefined?'GET':'POST',headers:{...(authorization?{authorization}:{}),'content-type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    })});
    return {response,data:await response.json()};
  };
  return {env,request,kvCalls,providerCalls,stored};
}

test('authenticated inbox reports flaming as its primary address and preserves pagination',async t=>{
  const metadata={from:'sender@example.com',subject:'Fixture subject',receivedAt:'2026-10-11T00:00:00Z'};
  const f=fixture(t,{listResult:{keys:[{name:'inbox:'+messageId,metadata}],list_complete:false,cursor:'next+page/='}});
  const {response,data}=await f.request('?cursor=previous%2Bpage%2F%3D');
  assert.equal(response.status,200);
  assert.deepEqual(data,{address:'flaming@ai-ing.org',messages:[{id:messageId,...metadata}],cursor:'next+page/='});
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(f.kvCalls,[{method:'list',options:{prefix:'inbox:',limit:50,cursor:'previous+page/='}}]);
  assert.equal(f.providerCalls.length,0);
  assert.ok(!JSON.stringify(data).includes(mailToken));assert.ok(!JSON.stringify(data).includes(sendToken));
});

test('send uses the CustomCloudBot flaming sender and reply address, then records the accepted message',async t=>{
  const f=fixture(t),input={action:'send',to:'reader@example.com',subject:'Hello',text:'Fixture only',requestId:'fixture-send-request-001',from:'spoof@example.com',reply_to:'spoof@example.com'};
  const {response,data}=await f.request('',input);
  assert.equal(response.status,200);
  assert.deepEqual(data,{accepted:true,id:'fixture-provider-id',from:'flaming@ai-ing.org'});
  assert.equal(f.providerCalls.length,1);
  const call=f.providerCalls[0];
  assert.equal(call.url,'https://api.resend.com/emails');assert.equal(call.options.method,'POST');
  assert.equal(call.options.headers.Authorization,'Bearer '+sendToken);
  assert.equal(call.options.headers['Idempotency-Key'],'openclaw-'+input.requestId);
  assert.deepEqual(call.body,{from:'CustomCloudBot <flaming@ai-ing.org>',to:['reader@example.com'],subject:'Hello',text:'Fixture only',reply_to:'flaming@ai-ing.org',headers:{}});
  const saved=f.stored.get('sent:'+input.requestId);
  assert.equal(saved.to,input.to);assert.equal(saved.subject,input.subject);assert.equal(saved.text,input.text);
  assert.equal(saved.providerId,'fixture-provider-id');assert.ok(Number.isFinite(Date.parse(saved.sentAt)));
  assert.ok(!JSON.stringify(data).includes(sendToken));assert.ok(!JSON.stringify(saved).includes(sendToken));
});

test('reply to legacy-address mail keeps the original recipient/thread and sends from flaming',async t=>{
  const original={id:messageId,from:'original-sender@example.com',to:'openclawbot@ai-ing.org',subject:'Original topic',messageId:'<fixture-original@example.com>',text:'Original body'};
  const f=fixture(t,{message:original});
  const input={action:'reply',id:messageId,text:'Fixture reply',requestId:'fixture-reply-request-001',to:'spoof@example.com',subject:'Forged topic'};
  const {response,data}=await f.request('',input);
  assert.equal(response.status,200);assert.equal(data.from,'flaming@ai-ing.org');
  assert.deepEqual(f.kvCalls[0],{method:'get',key:'inbox:'+messageId,type:'json'});
  assert.deepEqual(f.providerCalls[0].body,{
    from:'CustomCloudBot <flaming@ai-ing.org>',reply_to:'flaming@ai-ing.org',to:['original-sender@example.com'],
    subject:'Re: Original topic',text:'Fixture reply',headers:{'In-Reply-To':original.messageId,References:original.messageId},
  });
  assert.equal(f.stored.get('sent:'+input.requestId).to,original.from);
  assert.equal(f.stored.get('sent:'+input.requestId).subject,'Re: Original topic');
});

test('reply preserves an existing Re prefix and excludes unsafe threading headers',async t=>{
  const f=fixture(t,{message:{id:messageId,from:'sender@example.com',subject:'Re: Original topic',messageId:'<valid@example.com>\r\nBcc: hidden@example.com'}});
  const {response}=await f.request('',{action:'reply',id:messageId,text:'Fixture reply',requestId:'fixture-reply-request-002'});
  assert.equal(response.status,200);
  assert.equal(f.providerCalls[0].body.subject,'Re: Original topic');
  assert.deepEqual(f.providerCalls[0].body.headers,{});
});

test('unauthorized list, read and send reveal nothing and never access KV or the provider',async t=>{
  const f=fixture(t,{message:{id:messageId,from:'private@example.com',subject:'Private subject',text:'Private message'}});
  for(const authorization of [undefined,'Bearer wrong-token']){
    for(const [path,body] of [['',undefined],['?id='+messageId,undefined],['',{action:'send',to:'reader@example.com',text:'No send',subject:'No send',requestId:'fixture-denied-send-001'}]]){
      const {response,data}=await f.request(path,body,authorization??'');
      assert.equal(response.status,401);assert.deepEqual(data,{error:'Unauthorized'});
      assert.equal(response.headers.get('cache-control'),'no-store');
    }
  }
  const missingSecret=await f.request('',undefined,'Bearer '+mailToken,{...f.env,OPENCLAW_MAIL_TOKEN:''});
  assert.equal(missingSecret.response.status,401);assert.deepEqual(missingSecret.data,{error:'Unauthorized'});
  assert.deepEqual(f.kvCalls,[]);assert.deepEqual(f.providerCalls,[]);
});
