import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const contactHandler = require('../../../api/contact.js');

const validEnquiry = {
  name: 'Ria Sharma',
  company: 'Northstar Studio',
  email: 'ria@example.com',
  phone: '+91 98765 43210',
  message: 'We are launching a new brand film and would like to discuss production.',
  faxNumber: '',
};

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function createRequest(body = validEnquiry, overrides = {}) {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(JSON.stringify(body))),
      ...overrides.headers,
    },
    body,
    ...overrides,
  };
}

async function withRuntime({ apiKey, fetchImpl }, callback) {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFetch = globalThis.fetch;

  if (apiKey === undefined) {
    delete process.env.RESEND_API_KEY;
  } else {
    process.env.RESEND_API_KEY = apiKey;
  }
  if (fetchImpl) globalThis.fetch = fetchImpl;

  try {
    await callback();
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
}

test('rejects methods other than POST', async () => {
  const response = createResponse();
  await withRuntime({ apiKey: undefined }, () =>
    contactHandler({ method: 'GET', headers: {} }, response),
  );

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.allow, 'POST');
});

test('rejects invalid email addresses before calling Resend', async () => {
  let fetchCalled = false;
  const response = createResponse();
  await withRuntime({
    apiKey: 're_test_key',
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    },
  }, () =>
    contactHandler(createRequest({ ...validEnquiry, email: 'not-an-email' }), response),
  );

  assert.equal(response.statusCode, 400);
  assert.equal(fetchCalled, false);
});

test('silently accepts filled honeypot submissions without sending mail', async () => {
  let fetchCalled = false;
  const response = createResponse();
  await withRuntime({
    apiKey: undefined,
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    },
  }, () =>
    contactHandler(createRequest({ ...validEnquiry, faxNumber: '123-456' }), response),
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(fetchCalled, false);
});

test('does not send when the hidden honeypot contains an oversized value', async () => {
  let fetchCalled = false;
  const response = createResponse();
  await withRuntime({
    apiKey: 're_test_key',
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response('{}', { status: 200 });
    },
  }, () =>
    contactHandler(createRequest({ ...validEnquiry, faxNumber: 'x'.repeat(121) }), response),
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(fetchCalled, false);
});

test('sends the enquiry to the studio with the visitor as reply-to', async () => {
  let resendRequest;
  const response = createResponse();
  await withRuntime({
    apiKey: 're_test_key',
    fetchImpl: async (url, options) => {
      resendRequest = { url, options, body: JSON.parse(options.body) };
      return new Response('{"id":"email_test"}', { status: 200 });
    },
  }, () => contactHandler(createRequest(), response));

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.equal(resendRequest.url, 'https://api.resend.com/emails');
  assert.equal(resendRequest.options.headers.Authorization, 'Bearer re_test_key');
  assert.deepEqual(resendRequest.body.to, ['contact@theframewrkmedia.com']);
  assert.equal(resendRequest.body.reply_to, 'ria@example.com');
  assert.match(resendRequest.body.text, /Northstar Studio/);
  assert.match(resendRequest.body.text, /launching a new brand film/);
});

test('returns a clear setup error when the Resend key is missing', async () => {
  const response = createResponse();
  await withRuntime({ apiKey: undefined }, () =>
    contactHandler(createRequest(), response),
  );

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { ok: false, error: 'Email delivery is not configured yet.' });
});

test('does not expose provider errors when Resend rejects the message', async () => {
  const response = createResponse();
  await withRuntime({
    apiKey: 're_test_key',
    fetchImpl: async () => new Response('{"message":"secret provider detail"}', { status: 401 }),
  }, () => contactHandler(createRequest(), response));

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, { ok: false, error: 'Email delivery failed.' });
});