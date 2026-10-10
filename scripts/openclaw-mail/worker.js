import PostalMime from 'postal-mime';
import { onRequest } from '../../functions/api/bot-mail.js';

const BOT_ADDRESS = 'openclawbot@ai-ing.org';
const FLAMING_ADDRESS = 'flaming@ai-ing.org';
const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;

function forwardDestination(env) {
  const address = typeof env.FLAMING_FORWARD_TO === 'string' ? env.FLAMING_FORWARD_TO.trim() : '';
  // Require the existing verified destination; never fall back to another mailbox.
  if (address.length > 254 || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address) ||
      address.toLowerCase().endsWith('@ai-ing.org')) {
    throw new Error('Flaming forwarding destination is not configured');
  }
  return address;
}

async function archive(message, env, recipient) {
  const raw = await new Response(message.raw).arrayBuffer();
  if (raw.byteLength > MAX_ARCHIVE_BYTES) throw new Error('Archive size limit exceeded');
  const parsed = await PostalMime.parse(raw);
  // Keep existing bot IDs stable while separating identical MIME sent to both addresses.
  const identity = recipient === BOT_ADDRESS ? raw :
    await new Blob([recipient + '\0', raw]).arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', identity);
  const id = Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2,'0')).join('');
  const item = {
    id, from:message.from, to:recipient,
    subject:(parsed.subject || '').slice(0,1000),
    text:(parsed.text || '').slice(0,200000),
    messageId:parsed.messageId || '', references:parsed.references || '',
    receivedAt:new Date().toISOString(),
    attachments:(parsed.attachments || []).map(a=>({filename:a.filename,mimeType:a.mimeType})),
    contentTrust:'untrusted-email-content'
  };
  await env.OPENCLAW_MAIL.put('raw:'+id, raw);
  await env.OPENCLAW_MAIL.put('inbox:'+id, JSON.stringify(item), {
    metadata:{from:item.from,to:item.to,subject:item.subject.slice(0,200),receivedAt:item.receivedAt}
  });
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/bot-mail') {
      return new Response('Not found', {status:404, headers:{'cache-control':'no-store'}});
    }
    return onRequest({request, env});
  },
  async email(message, env) {
    const recipient = message.to.toLowerCase();
    if (recipient !== BOT_ADDRESS && recipient !== FLAMING_ADDRESS) {
      message.setReject('Unknown mailbox'); return;
    }

    if (recipient === FLAMING_ADDRESS) {
      const destination = forwardDestination(env);
      // Delivery to the existing inbox takes precedence over the optional app copy.
      try {
        await message.forward(destination);
      } catch {
        // Do not expose provider errors, recipient addresses, or message contents in logs.
        throw new Error('Flaming forwarding failed');
      }
      if (message.rawSize > MAX_ARCHIVE_BYTES) {
        console.warn('mail_archive_skipped_size_limit');
        return;
      }
      try {
        await archive(message, env, recipient);
      } catch {
        // Once forwarded, a storage failure must not trigger another forwarding attempt.
        console.error('mail_archive_failed_after_forward');
      }
      return;
    }

    if (message.rawSize > MAX_ARCHIVE_BYTES) {
      message.setReject('Message exceeds 10 MiB'); return;
    }
    await archive(message, env, recipient);
  }
};
