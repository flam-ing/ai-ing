import PostalMime from 'postal-mime';

export default {
  async email(message, env) {
    if (message.to.toLowerCase() !== 'openclawbot@ai-ing.org') {
      message.setReject('Unknown mailbox'); return;
    }
    if (message.rawSize > 10 * 1024 * 1024) {
      message.setReject('Message exceeds 10 MiB'); return;
    }
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);
    const hash = await crypto.subtle.digest('SHA-256', raw);
    const id = Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2,'0')).join('');
    const item = {
      id, from:message.from, to:message.to,
      subject:(parsed.subject || '').slice(0,1000),
      text:(parsed.text || '').slice(0,200000),
      messageId:parsed.messageId || '', references:parsed.references || '',
      receivedAt:new Date().toISOString(),
      attachments:(parsed.attachments || []).map(a=>({filename:a.filename,mimeType:a.mimeType})),
      contentTrust:'untrusted-email-content'
    };
    await env.OPENCLAW_MAIL.put('raw:'+id, raw);
    await env.OPENCLAW_MAIL.put('inbox:'+id, JSON.stringify(item), {
      metadata:{from:item.from,subject:item.subject.slice(0,200),receivedAt:item.receivedAt}
    });
  }
};
