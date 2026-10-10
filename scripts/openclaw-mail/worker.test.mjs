import assert from 'node:assert/strict';
import { createHash, timingSafeEqual, webcrypto } from 'node:crypto';
import { test } from 'node:test';
import PostalMime from 'postal-mime';
import worker from './worker.js';

const MIME = 'From: sender@example.net\r\nTo: flaming@ai-ing.org\r\nSubject: Fixture\r\nMessage-ID: <fixture@example.net>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nFixture body';

function fixture(recipient = 'flaming@ai-ing.org', options = {}) {
  const events = [], writes = [], forwarded = [], rejected = [];
  const raw = new TextEncoder().encode(MIME);
  const message = {
    from: 'sender@example.net', to: recipient, rawSize: options.rawSize ?? raw.byteLength,
    get raw() {
      events.push('read');
      if (options.readFailure) throw new Error('sensitive read detail');
      return new Blob([raw]).stream();
    },
    async forward(to) {
      events.push('forward'); forwarded.push(to);
      if (options.forwardFailure) throw new Error('sensitive forwarding detail');
    },
    setReject(reason) { rejected.push(reason); }
  };
  const env = {
    FLAMING_FORWARD_TO: 'existing-inbox@example.net',
    OPENCLAW_MAIL: {
      async put(key, value, metadata) {
        events.push(key.startsWith('raw:') ? 'store-raw' : 'store-inbox');
        if (options.storeFailure === 'all' || options.storeFailure === key.split(':')[0]) {
          throw new Error('sensitive storage detail');
        }
        writes.push({ key, value, metadata });
      }
    }
  };
  return { message, env, events, writes, forwarded, rejected };
}

test('flaming forwards to the configured destination before archiving MIME and inbox metadata', async () => {
  const f = fixture('FLAMING@ai-ing.org');
  await worker.email(f.message, f.env);
  assert.deepEqual(f.forwarded, ['existing-inbox@example.net']);
  assert.deepEqual(f.events, ['forward', 'read', 'store-raw', 'store-inbox']);
  assert.deepEqual(f.rejected, []);
  const item = JSON.parse(f.writes[1].value);
  assert.equal(item.to, 'flaming@ai-ing.org');
  assert.equal(item.subject, 'Fixture');
  assert.equal(item.text, 'Fixture body\n');
  assert.equal(item.contentTrust, 'untrusted-email-content');
  assert.equal(f.writes[1].metadata.metadata.to, 'flaming@ai-ing.org');
});

test('existing bot mailbox archives only, retaining the original MIME-based ID', async () => {
  const f = fixture('openclawbot@ai-ing.org');
  delete f.env.FLAMING_FORWARD_TO;
  await worker.email(f.message, f.env);
  assert.deepEqual(f.forwarded, []);
  assert.deepEqual(f.rejected, []);
  assert.equal(f.writes[0].key, 'raw:' + createHash('sha256').update(MIME).digest('hex'));
  assert.equal(f.writes.length, 2);
});

test('the same MIME addressed to both supported mailboxes does not overwrite one inbox copy', async () => {
  const bot = fixture('openclawbot@ai-ing.org'), flaming = fixture();
  await worker.email(bot.message, bot.env);
  await worker.email(flaming.message, flaming.env);
  assert.notEqual(bot.writes[1].key, flaming.writes[1].key);
});

test('unknown addresses, including the unconfigured hyphenated spelling, are rejected without delivery or storage', async () => {
  for (const recipient of ['unknown@ai-ing.org', 'flam-ing@ai-ing.org', 'flaming@other.example']) {
    const f = fixture(recipient);
    await worker.email(f.message, f.env);
    assert.deepEqual(f.rejected, ['Unknown mailbox']);
    assert.deepEqual(f.events, []);
  }
});

test('missing, invalid, or same-zone forwarding configuration fails before accepting or archiving flaming mail', async () => {
  for (const value of [undefined, '', 'invalid', 'a@example.net\r\nBcc: b@example.net', 'a@example.net,b@example.net', 'openclawbot@ai-ing.org', 'other@AI-ING.ORG']) {
    const f = fixture();
    f.env.FLAMING_FORWARD_TO = value;
    await assert.rejects(worker.email(f.message, f.env), { message: 'Flaming forwarding destination is not configured' });
    assert.deepEqual(f.events, []);
    assert.deepEqual(f.rejected, []);
  }
});

test('forwarding failure is not swallowed or represented as a successfully stored email', async () => {
  const f = fixture(undefined, { forwardFailure: true });
  await assert.rejects(worker.email(f.message, f.env), { message: 'Flaming forwarding failed' });
  assert.deepEqual(f.events, ['forward']);
  assert.deepEqual(f.rejected, []);
  assert.deepEqual(f.writes, []);
});

test('archiving waits until forwarding has completed successfully', async () => {
  const f = fixture();
  let completeForward;
  f.message.forward = async to => {
    f.events.push('forward');
    f.forwarded.push(to);
    await new Promise(resolve => { completeForward = resolve; });
  };
  const handling = worker.email(f.message, f.env);
  await Promise.resolve();
  assert.deepEqual(f.events, ['forward']);
  assert.deepEqual(f.writes, []);
  completeForward();
  await handling;
  assert.deepEqual(f.events, ['forward', 'read', 'store-raw', 'store-inbox']);
});

test('parser failure cannot prevent forwarding or leak error details to logs', async t => {
  const log = t.mock.method(console, 'error', () => {});
  t.mock.method(PostalMime, 'parse', async () => { throw new Error('sensitive parser detail'); });
  const f = fixture();
  await worker.email(f.message, f.env);
  assert.deepEqual(f.forwarded, ['existing-inbox@example.net']);
  assert.deepEqual(f.rejected, []);
  assert.deepEqual(f.writes, []);
  assert.deepEqual(log.mock.calls.map(call => call.arguments), [['mail_archive_failed_after_forward']]);
});

test('raw reading and both KV write failures keep successful forwarding and emit only a fixed diagnostic', async t => {
  const log = t.mock.method(console, 'error', () => {});
  for (const options of [{ readFailure: true }, { storeFailure: 'raw' }, { storeFailure: 'inbox' }]) {
    const f = fixture(undefined, options);
    await worker.email(f.message, f.env);
    assert.deepEqual(f.forwarded, ['existing-inbox@example.net']);
    assert.deepEqual(f.rejected, []);
  }
  assert.equal(log.mock.calls.length, 3);
  assert.ok(log.mock.calls.every(call => JSON.stringify(call.arguments) === '["mail_archive_failed_after_forward"]'));
});

test('oversize flaming mail is still forwarded, while oversize bot mail retains its existing rejection', async t => {
  const log = t.mock.method(console, 'warn', () => {});
  const flaming = fixture(undefined, { rawSize: 10 * 1024 * 1024 + 1 });
  await worker.email(flaming.message, flaming.env);
  assert.deepEqual(flaming.events, ['forward']);
  assert.deepEqual(flaming.rejected, []);
  assert.deepEqual(log.mock.calls[0].arguments, ['mail_archive_skipped_size_limit']);
  const bot = fixture('openclawbot@ai-ing.org', { rawSize: 10 * 1024 * 1024 + 1 });
  await worker.email(bot.message, bot.env);
  assert.deepEqual(bot.events, []);
  assert.deepEqual(bot.rejected, ['Message exceeds 10 MiB']);
});

test('bot storage failures remain failures rather than silent acceptance', async () => {
  const f = fixture('openclawbot@ai-ing.org', { storeFailure: 'raw' });
  await assert.rejects(worker.email(f.message, f.env));
  assert.deepEqual(f.forwarded, []);
});

test('HTTP handler rejects every path except the exact mail API path without touching bindings', async () => {
  const env = new Proxy({}, { get() { throw new Error('Unexpected binding access'); } });
  for (const path of ['/', '/api/bot-mail/', '/api/bot-mail-extra', '/api/bot-mail%2F', '/other']) {
    const response = await worker.fetch(new Request('https://ai-ing.org' + path), env);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('HTTP mail API delegates authentication to the real handler and rejects missing or wrong tokens', async t => {
  // Node lacks Workers' timingSafeEqual extension; retain the real SHA-256/auth path.
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable:true, value:{subtle:{
    digest:webcrypto.subtle.digest.bind(webcrypto.subtle),
    timingSafeEqual:(a,b)=>timingSafeEqual(Buffer.from(a),Buffer.from(b)),
  }}});
  t.after(() => Object.defineProperty(globalThis, 'crypto', descriptor));
  const env = {OPENCLAW_MAIL_TOKEN:'fixture-private-mail-token', get OPENCLAW_MAIL() {
    throw new Error('Unauthorized request must not read mailbox storage');
  }};
  for (const authorization of [undefined, 'Bearer incorrect-fixture-token']) {
    const request = new Request('https://ai-ing.org/api/bot-mail?cursor=fixture', {
      headers:authorization ? {authorization} : {},
    });
    const response = await worker.fetch(request, env);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {error:'Unauthorized'});
  }
});
