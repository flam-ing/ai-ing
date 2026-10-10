const ADDRESS = 'flaming@ai-ing.org';
const json = (data, status=200) => new Response(JSON.stringify(data), {
  status, headers:{'content-type':'application/json','cache-control':'no-store'}
});
async function authorized(request, secret) {
  if (!secret) return false;
  const value = request.headers.get('authorization') || '';
  const enc = new TextEncoder();
  const a = await crypto.subtle.digest('SHA-256',enc.encode(value));
  const b = await crypto.subtle.digest('SHA-256',enc.encode('Bearer '+secret));
  return crypto.subtle.timingSafeEqual(a,b);
}
export async function onRequest({request,env}) {
  if (!await authorized(request,env.OPENCLAW_MAIL_TOKEN)) return json({error:'Unauthorized'},401);
  if (!env.OPENCLAW_MAIL) return json({error:'Mailbox not configured'},503);
  const url=new URL(request.url), id=url.searchParams.get('id');
  if (request.method==='GET') {
    if (id) {
      if (!/^[a-f0-9]{64}$/.test(id)) return json({error:'Invalid id'},400);
      const item=await env.OPENCLAW_MAIL.get('inbox:'+id,'json');
      if(!item) return json({error:'Not found'},404);
      if(url.searchParams.get('raw')==='1') return new Response(await env.OPENCLAW_MAIL.get('raw:'+id,'arrayBuffer'),{
        headers:{'content-type':'message/rfc822','content-disposition':'attachment; filename="message.eml"','cache-control':'no-store'}
      });
      return json(item);
    }
    const result=await env.OPENCLAW_MAIL.list({prefix:'inbox:',limit:50,cursor:url.searchParams.get('cursor') || undefined});
    return json({address:ADDRESS,messages:result.keys.map(k=>({id:k.name.slice(6),...k.metadata})),cursor:result.list_complete?null:result.cursor});
  }
  if(request.method!=='POST') return json({error:'Method not allowed'},405);
  let input;
  try {
    const reader=request.body?.getReader();
    if(!reader) return json({error:'Missing body'},400);
    let size=0;const chunks=[];
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return json({error:'Body too large'},413);}chunks.push(value);}
    input=JSON.parse(await new Response(new Blob(chunks)).text());
  } catch {return json({error:'Invalid JSON'},400);}
  if(!['send','reply'].includes(input.action)) return json({error:'Use send or reply'},400);
  if(typeof input.text!=='string'||!input.text.trim()||input.text.length>40000) return json({error:'Invalid text'},400);
  if(!/^[a-zA-Z0-9_-]{16,100}$/.test(input.requestId || '')) return json({error:'Unique requestId required (16-100 characters)'},400);
  let to=input.to, subject=input.subject, headers={};
  if(input.automatic === true) {
    headers['Auto-Submitted']='auto-replied';
    headers['X-Auto-Response-Suppress']='All';
  }
  if(input.action==='reply') {
    if(!/^[a-f0-9]{64}$/.test(input.id || ''))return json({error:'Invalid message id'},400);
    const original=await env.OPENCLAW_MAIL.get('inbox:'+input.id,'json');
    if(!original)return json({error:'Message not found'},404);
    to=original.from;subject=/^re:/i.test(original.subject)?original.subject:'Re: '+original.subject;
    if(original.messageId && !/[\r\n]/.test(original.messageId)) {
      headers['In-Reply-To']=original.messageId;
      headers.References=original.messageId;
    }
  }
  if(typeof to!=='string'||! /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(to)||to.length>254) return json({error:'One valid recipient required'},400);
  if(typeof subject!=='string'||subject.length>1000||/[\r\n]/.test(subject)) return json({error:'Invalid subject'},400);
  if(!env.RESEND_API_KEY)return json({error:'Sending not configured'},503);
  let response;
  try {
    response=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{'Authorization':'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'openclaw-'+input.requestId},
      body:JSON.stringify({from:'CustomCloudBot <'+ADDRESS+'>',to:[to],subject,text:input.text,reply_to:ADDRESS,headers}),
      signal:AbortSignal.timeout(15000)
    });
  }catch{return json({error:'Provider connection failed; retry with the same requestId'},502);}
  const result=await response.json();
  if(!response.ok)return json({error:'Send rejected',providerStatus:response.status,detail:result.message},502);
  await env.OPENCLAW_MAIL.put('sent:'+input.requestId,JSON.stringify({to,subject,text:input.text,providerId:result.id,sentAt:new Date().toISOString()}));
  return json({accepted:true,id:result.id,from:ADDRESS});
}
