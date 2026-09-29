const MAX_BODY_LENGTH = 12_000;
const CONTACT_EMAIL = 'contact@theframewrkmedia.com';
const SENDER = 'FrameWrk Media <contact@theframewrkmedia.com>';
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function singleLine(value, maximumLength) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/[\r\n\0]/g, ' ').trim();
  return normalized.length <= maximumLength ? normalized : null;
}

function messageText(value, maximumLength) {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\r\n?/g, '\n').replace(/\0/g, '').trim();
  return normalized.length <= maximumLength ? normalized : null;
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }

  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

module.exports = async function contactHandler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return reply(response, 405, { ok: false, error: 'Method not allowed.' });
  }

  const contentType = String(request.headers?.['content-type'] ?? '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return reply(response, 415, { ok: false, error: 'Send the form as JSON.' });
  }

  const contentLength = Number(request.headers?.['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_LENGTH) {
    return reply(response, 413, { ok: false, error: 'The enquiry is too large.' });
  }

  const body = parseBody(request.body);
  if (!body) {
    return reply(response, 400, { ok: false, error: 'Enter your enquiry details and try again.' });
  }

  // Quietly accept the request without sending when a bot fills the hidden field.
  const honeypot = singleLine(body.faxNumber, 120);
  if (honeypot === null || honeypot) {
    return reply(response, 200, { ok: true });
  }

  const name = singleLine(body.name, 120);
  const company = singleLine(body.company, 160);
  const email = singleLine(body.email, 320);
  const phone = singleLine(body.phone, 80);
  const message = messageText(body.message, 5000);

  if (
    !name ||
    company === null ||
    !email ||
    !EMAIL_PATTERN.test(email) ||
    phone === null ||
    !message
  ) {
    return reply(response, 400, { ok: false, error: 'Check the required fields and try again.' });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return reply(response, 503, { ok: false, error: 'Email delivery is not configured yet.' });
  }

  const text = [
    'New enquiry from the FrameWrk Media website',
    '',
    `Name: ${name}`,
    `Company / brand: ${company || 'Not provided'}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    '',
    'Project details:',
    message,
  ].join('\n');

  try {
    const resendResponse = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER,
        to: [CONTACT_EMAIL],
        reply_to: email,
        subject: `New website enquiry from ${name}`,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!resendResponse.ok) {
      return reply(response, 502, { ok: false, error: 'Email delivery failed.' });
    }

    return reply(response, 200, { ok: true });
  } catch {
    return reply(response, 502, { ok: false, error: 'Email delivery failed.' });
  }
};