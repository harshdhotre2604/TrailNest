const dns = require('dns').promises;
const net = require('net');
const cheerio = require('cheerio');

const MAX_RESPONSE_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

class UnsafeUrlError extends Error {}

// Blocks loopback, private, link-local, and other non-public ranges so a
// user-supplied "property link" can't be used to reach internal services
// (the backend container itself, the DB host, cloud metadata endpoints, etc).
function isPrivateAddress(address, family) {
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized === '::1') return true;
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('::ffff:')) return isPrivateAddress(normalized.slice(7), 4);
    return false;
  }
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 0) return true;
  if (a >= 224) return true; // multicast/reserved
  return false;
}

async function assertPublicHostname(hostname) {
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname, net.isIP(hostname))) {
      throw new UnsafeUrlError('That link points at a private address, which isn\'t allowed.');
    }
    return;
  }
  let records;
  try {
    records = await dns.lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError('Could not resolve that link\'s address.');
  }
  if (records.length === 0 || records.some((r) => isPrivateAddress(r.address, r.family))) {
    throw new UnsafeUrlError('That link points at a private address, which isn\'t allowed.');
  }
}

async function assertSafeUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new UnsafeUrlError('That doesn\'t look like a valid URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http(s) links are supported.');
  }
  await assertPublicHostname(parsed.hostname);
  return parsed;
}

async function readBodyCapped(response) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    return text.slice(0, MAX_RESPONSE_BYTES);
  }
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

/**
 * Fetches a page server-side and returns its visible text only — never the
 * raw HTML/scripts. Validates the URL (and every redirect hop) isn't
 * pointing at a private/internal address before connecting.
 */
async function fetchPageText(urlString) {
  let currentUrl = urlString;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const parsed = await assertSafeUrl(currentUrl);

    const response = await fetch(parsed.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'TrailNest-AI-FormHelper/1.0' },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new UnsafeUrlError('That link redirected without a destination.');
      currentUrl = new URL(location, parsed).toString();
      continue;
    }

    if (!response.ok) {
      throw new UnsafeUrlError(`That link returned an error (HTTP ${response.status}).`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new UnsafeUrlError('That link isn\'t a readable web page.');
    }

    const html = await readBodyCapped(response);
    const $ = cheerio.load(html);
    $('script, style, noscript, svg, iframe').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.slice(0, MAX_TEXT_CHARS);
  }

  throw new UnsafeUrlError('That link redirected too many times.');
}

module.exports = { fetchPageText, UnsafeUrlError };
