const ALLOWED_HOSTS = new Set([
  'bcdnxw.hakunaymatata.com',
  'pbcdnw.aoneroom.com',
  'cacdn.hakunaymatata.com',
  'api.zstlab.cyou',
  'zstlab.cyou'
]);
const SITE_ORIGIN = 'https://fmoviesunblocked.net/';
const INITIAL_RANGE = 'bytes=0-65535';

export const config = { runtime: 'edge' };

function commonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  };
}

function textResponse(text, status) {
  return new Response(text, { status, headers: { ...commonHeaders(), 'Content-Type': 'text/plain; charset=utf-8' } });
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), { status, headers: { ...commonHeaders(), 'Content-Type': 'application/json; charset=utf-8' } });
}

function looksLikeFirstPartyBrowser(request) {
  const headers = request.headers;
  const accept = (headers.get('accept') || '').toLowerCase();
  return Boolean(
    headers.get('sec-fetch-site') || headers.get('sec-fetch-mode') || headers.get('sec-fetch-dest') ||
    headers.get('referer') || headers.get('referrer') || accept.includes('text/html') ||
    accept.includes('application/json') || accept.includes('video/')
  );
}

function safeFilename(name) {
  return String(name || '').replace(/[\r\n"\\]/g, '').slice(0, 180) || 'download';
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function providerHeaders(request, range) {
  const origin = (request.headers.get('origin') || 'https://movie-website-alpha-one.vercel.app').replace(/\/$/, '');
  const headers = {
    'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: request.headers.get('accept') || 'video/mp4,*/*',
    Referer: request.headers.get('referer') || `${origin}/`,
    Origin: origin,
    'Sec-Fetch-Site': request.headers.get('sec-fetch-site') || 'same-site',
    'Sec-Fetch-Mode': request.headers.get('sec-fetch-mode') || 'cors',
    'Sec-Fetch-Dest': request.headers.get('sec-fetch-dest') || 'video'
  };
  if (range) headers.Range = range;
  return headers;
}

async function fetchProvider(targetUrl, request, range) {
  const providerUrl = `https://api.zstlab.cyou/api/proxy?url=${encodeURIComponent(targetUrl)}&_cinemind_proxy_ts=${Date.now()}`;
  return fetchWithTimeout(providerUrl, { method: request.method, headers: providerHeaders(request, range), redirect: 'follow' }, 15_000);
}

function copyMediaHeaders(upstream, baseHeaders, name) {
  const headers = new Headers(baseHeaders);
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
  for (const [source, target] of [['content-length', 'Content-Length'], ['content-range', 'Content-Range'], ['accept-ranges', 'Accept-Ranges']]) {
    const value = upstream.headers.get(source);
    if (value) headers.set(target, value);
  }
  if (name) headers.set('Content-Disposition', `attachment; filename="${safeFilename(name)}"`);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return headers;
}

export default async function handler(request) {
  const baseHeaders = commonHeaders();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
  if (!['GET', 'HEAD'].includes(request.method)) return textResponse('Method Not Allowed', 405);
  if (!looksLikeFirstPartyBrowser(request)) return textResponse('Forbidden', 403);

  const requestUrl = new URL(request.url);
  const encodedUrl = requestUrl.searchParams.get('url');
  const name = requestUrl.searchParams.get('name');
  if (!encodedUrl) return jsonResponse({ error: 'Missing url parameter' }, 400);

  try {
    const targetUrl = decodeURIComponent(encodedUrl);
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsedUrl.hostname)) return textResponse('Forbidden', 403);

    const isApiHost = parsedUrl.hostname === 'api.zstlab.cyou' || parsedUrl.hostname === 'zstlab.cyou';
    const isMediaHost = !isApiHost;
    const path = parsedUrl.pathname.toLowerCase();
    const isVideoMedia = /\.(?:mp4|m4v|webm|mov|m3u8|mpd)$/.test(path);
    const isSubtitleMedia = /\.(?:srt|vtt|ass|ssa|ttml|dfxp)$/.test(path);
    const requestedRange = request.headers.get('range');
    const range = requestedRange || (isMediaHost && isVideoMedia && !isSubtitleMedia ? INITIAL_RANGE : null);
    const directHeaders = {
      'User-Agent': 'okhttp/4.12.0',
      Referer: SITE_ORIGIN,
      Origin: 'https://fmoviesunblocked.net',
      Host: parsedUrl.hostname
    };
    if (range) directHeaders.Range = range;

    let upstream;
    try {
      upstream = await fetchWithTimeout(targetUrl, { method: request.method, headers: directHeaders, redirect: 'follow' }, isMediaHost && isVideoMedia ? 4500 : 15000);
    } catch (error) {
      if (!isMediaHost) throw error;
    }
    if ((!upstream || !upstream.ok) && isMediaHost) upstream = await fetchProvider(targetUrl, request, range);
    if (!upstream) return jsonResponse({ error: 'upstream unavailable' }, 504);
    if (!upstream.ok) return jsonResponse({ error: `upstream ${upstream.status}` }, upstream.status);

    const contentRange = upstream.headers.get('content-range');
    const status = range && contentRange ? 206 : upstream.status;
    return new Response(request.method === 'HEAD' ? null : upstream.body, { status, headers: copyMediaHeaders(upstream, baseHeaders, name) });
  } catch (error) {
    console.error('Proxy error:', error);
    return jsonResponse({ error: 'Proxy failed' }, 502);
  }
}
