const DEFAULT_ALLOWED_HOSTS = [
  'bcdnxw.hakunaymatata.com',
  'pbcdnw.aoneroom.com',
  'cacdn.hakunaymatata.com',
  'api.zstlab.cyou',
  'zstlab.cyou'
];
const SITE_ORIGIN = 'https://fmoviesunblocked.net/';
const INITIAL_RANGE = 'bytes=0-65535';
const MEDIA_EXTENSIONS = /\.(?:mp4|m4v|webm|mov|m3u8|mpd)$/i;
const SUBTITLE_EXTENSIONS = /\.(?:srt|vtt|ass|ssa|ttml|dfxp)$/i;
const FORWARDED_REQUEST_HEADERS = ['accept', 'if-none-match', 'if-modified-since', 'if-range'];
const FORWARDED_RESPONSE_HEADERS = [
  ['accept-ranges', 'Accept-Ranges'],
  ['content-disposition', 'Content-Disposition'],
  ['content-length', 'Content-Length'],
  ['content-range', 'Content-Range'],
  ['content-type', 'Content-Type'],
  ['etag', 'ETag'],
  ['expires', 'Expires'],
  ['last-modified', 'Last-Modified']
];

export const config = { runtime: 'edge' };

function commonHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, If-None-Match, If-Modified-Since, If-Range',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, Content-Type, Content-Disposition, ETag, Last-Modified',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff'
  };
}

function textResponse(text, status) {
  return new Response(text, {
    status,
    headers: { ...commonHeaders(), 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function jsonResponse(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...commonHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function looksLikeFirstPartyBrowser(request) {
  const headers = request.headers;
  const accept = (headers.get('accept') || '').toLowerCase();
  return Boolean(
    headers.get('sec-fetch-site') || headers.get('sec-fetch-mode') || headers.get('sec-fetch-dest') ||
    headers.get('referer') || headers.get('referrer') || accept.includes('text/html') ||
    accept.includes('application/json') || accept.includes('video/') || accept.includes('text/vtt') ||
    accept.includes('text/plain') || accept.includes('application/octet-stream')
  );
}

function safeFilename(name) {
  return String(name || '')
    .replace(/[\r\n"\\/]/g, '')
    .replace(/[<>:*?|]/g, '')
    .trim()
    .slice(0, 180) || 'download';
}

function getAllowedHosts() {
  const configured = String(process.env.ALLOWED_HOSTS || '')
    .split(',')
    .map(host => host.trim().toLowerCase().replace(/\.$/, ''))
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_HOSTS;
}

function isAllowedHost(hostname) {
  const normalized = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return getAllowedHosts().some(host => normalized === host || normalized.endsWith(`.${host}`));
}

function parseTargetUrl(rawTargetUrl) {
  try {
    return new URL(rawTargetUrl);
  } catch {
    try {
      return new URL(decodeURIComponent(rawTargetUrl));
    } catch {
      throw new Error('url must be a valid absolute URL');
    }
  }
}

function signedUrlExpiry(targetUrl) {
  const value = targetUrl.searchParams.get('t');
  if (!value || !/^\d{9,}$/.test(value)) return null;
  const timestamp = Number(value);
  return Number.isSafeInteger(timestamp) ? timestamp : null;
}

function buildUpstreamRequestHeaders(request, rangeOverride) {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (rangeOverride !== undefined) {
    if (rangeOverride) headers.set('Range', rangeOverride);
    else headers.delete('Range');
  }

  const userAgent = process.env.UPSTREAM_USER_AGENT || request.headers.get('user-agent');
  if (userAgent) headers.set('User-Agent', userAgent);

  const referer = process.env.UPSTREAM_REFERER || request.headers.get('referer') || SITE_ORIGIN;
  const origin = process.env.UPSTREAM_ORIGIN || request.headers.get('origin') || SITE_ORIGIN.replace(/\/$/, '');
  if (referer) headers.set('Referer', referer);
  if (origin) headers.set('Origin', origin);
  return headers;
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

async function fetchProvider(targetUrl, request, range) {
  const providerBase = process.env.PROVIDER_PROXY_URL || 'https://api.zstlab.cyou/api/proxy';
  const separator = providerBase.includes('?') ? '&' : '?';
  const providerUrl = `${providerBase}${separator}url=${encodeURIComponent(targetUrl.toString())}&_cinemind_proxy_ts=${Date.now()}`;
  return fetchWithTimeout(providerUrl, {
    method: request.method,
    headers: buildUpstreamRequestHeaders(request, range),
    redirect: 'follow'
  }, 15_000);
}

function buildResponseHeaders(upstream, targetUrl, name, isSubtitleMedia) {
  const headers = new Headers(commonHeaders());
  for (const [source, target] of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(source);
    if (value) headers.set(target, value);
  }

  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/octet-stream');
  if (name) {
    headers.set('Content-Disposition', `attachment; filename="${safeFilename(name)}"`);
    headers.set('Cache-Control', 'no-store');
  } else if (isSubtitleMedia) {
    headers.set('Cache-Control', 'no-store');
  } else {
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=86400, stale-while-revalidate=60');
  }
  headers.set('Vary', 'Range');
  headers.set('X-Proxy-Upstream-Host', targetUrl.hostname);
  return headers;
}

export default async function handler(request) {
  const baseHeaders = commonHeaders();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: baseHeaders });
  if (!['GET', 'HEAD'].includes(request.method)) return textResponse('Method Not Allowed', 405);
  if (!looksLikeFirstPartyBrowser(request)) return textResponse('Forbidden', 403);

  const requestUrl = new URL(request.url);
  const rawTargetUrl = requestUrl.searchParams.get('url');
  const name = requestUrl.searchParams.get('name');
  if (!rawTargetUrl) return jsonResponse({ error: 'Missing url parameter' }, 400);

  let targetUrl;
  try {
    targetUrl = parseTargetUrl(rawTargetUrl);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Invalid url' }, 400);
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) return textResponse('Forbidden', 403);
  if (!isAllowedHost(targetUrl.hostname)) return textResponse('Forbidden', 403);

  const path = targetUrl.pathname.toLowerCase();
  const isVideoMedia = MEDIA_EXTENSIONS.test(path);
  const isSubtitleMedia = SUBTITLE_EXTENSIONS.test(path);
  const isApiHost = targetUrl.hostname === 'api.zstlab.cyou' || targetUrl.hostname === 'zstlab.cyou';
  const isDownloadRequest = Boolean(name);
  const requestedRange = request.headers.get('range');
  const range = isDownloadRequest
    ? null
    : (requestedRange || (!isApiHost && isVideoMedia && !isSubtitleMedia ? INITIAL_RANGE : null));

  try {
    let upstream;
    try {
      upstream = await fetchWithTimeout(targetUrl, {
        method: request.method,
        headers: buildUpstreamRequestHeaders(request, range),
        redirect: 'follow'
      }, !isDownloadRequest && isVideoMedia ? 4_500 : 15_000);
    } catch (error) {
      if (!isApiHost) upstream = await fetchProvider(targetUrl, request, range);
      else throw error;
    }

    if ((!upstream || !upstream.ok) && !isApiHost) {
      upstream = await fetchProvider(targetUrl, request, range);
    }
    if (!upstream) return jsonResponse({ error: 'Upstream unavailable' }, 504);
    if (!upstream.ok && upstream.status !== 304) {
      const expiry = signedUrlExpiry(targetUrl);
      const payload = {
        error: 'Upstream request failed',
        upstreamStatus: upstream.status,
        upstreamStatusText: upstream.statusText,
        upstreamHost: targetUrl.hostname,
        ...(expiry !== null && expiry * 1000 < Date.now() ? { signedUrlExpired: true } : {})
      };
      const headers = new Headers(commonHeaders());
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Proxy-Upstream-Status', String(upstream.status));
      return new Response(JSON.stringify(payload), {
        status: upstream.status,
        headers: { ...Object.fromEntries(headers.entries()), 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    return new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      headers: buildResponseHeaders(upstream, targetUrl, name, isSubtitleMedia)
    });
  } catch (error) {
    console.error('Proxy error:', error);
    const expiry = signedUrlExpiry(targetUrl);
    return jsonResponse({
      error: 'Proxy failed',
      ...(expiry !== null && expiry * 1000 < Date.now() ? { signedUrlExpired: true } : {})
    }, 502);
  }
}
