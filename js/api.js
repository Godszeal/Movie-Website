var cfg = window.CineMind && window.CineMind.config;

var cache = new Map();
var CACHE_TTL = 5 * 60 * 1000;

function apiBase() {
  return cfg && cfg.get('api.baseUrl') ? cfg.get('api.baseUrl') : 'https://zstlab.cyou/api';
}

function apiKey() {
  return cfg && cfg.get('api.apiKey') ? cfg.get('api.apiKey') : '';
}

function buildUrl(endpoint, params) {
  const url = new URL(apiBase());
  url.pathname = url.pathname.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');
  url.searchParams.set('apikey', apiKey());
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

function getCached(url, allowStale) {
  const memoryEntry = cache.get(url);
  if (memoryEntry && (allowStale || Date.now() <= memoryEntry.expiry)) return memoryEntry.data;
  try {
    const stored = JSON.parse(localStorage.getItem(`cinemind_api_${url}`) || 'null');
    if (stored && (allowStale || Date.now() <= stored.expiry)) {
      cache.set(url, stored);
      return stored.data;
    }
  } catch {}
  return null;
}

function setCache(url, data) {
  const entry = { data, expiry: Date.now() + CACHE_TTL, savedAt: Date.now() };
  cache.set(url, entry);
  try { localStorage.setItem(`cinemind_api_${url}`, JSON.stringify(entry)); } catch {}
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: { 'Accept': 'application/json' },
    signal
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : { status: true, data: {} };
  } catch {
    throw new Error('Invalid response from server');
  }
  if (!response.ok || data?.status === false) {
    const message = data?.message || data?.error || response.statusText || 'Request failed';
    throw new Error(`HTTP ${response.status}: ${message}`);
  }
  return data;
}

async function request(endpoint, params, options) {
  let url = buildUrl(endpoint, params);
  const fresh = options && options.fresh === true;
  if (fresh) url += `${url.includes('?') ? '&' : '?'}_cinemind_ts=${Date.now()}`;
  const cached = fresh ? null : getCached(url);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let data;
    try {
      data = await fetchJson(url, controller.signal);
    } catch (directError) {
      // Same-origin fallback helps when a host blocks cross-origin API requests.
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      if (window.location.protocol === 'file:') throw directError;
      data = await fetchJson(proxyUrl, controller.signal);
    }
    if (!fresh) setCache(url, data);
    return data;
  } catch (err) {
    const stale = fresh ? null : getCached(url, true);
    if (stale) return stale;
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function getHomepage() {
  return request('homepage');
}

function searchMovies(query, page, perPage, subjectType) {
  const cfgSearch = cfg && cfg.get('api.search') || {};
  return request('search', {
    query: query || '',
    subjectType: subjectType || cfgSearch.subjectType || 'ALL',
    page: page || cfgSearch.page || 1,
    perPage: perPage || cfgSearch.perPage || 24
  });
}

function getSearchSuggestions(query, perPage) {
  const cfgSugg = cfg && cfg.get('api.searchSuggestions') || {};
  return request('search-suggestion', {
    query: query || '',
    per_page: perPage || cfgSugg.perPage || 10
  });
}

function getPopularSearches() {
  return request('popular-searches');
}

function getHotMoviesSeries() {
  return request('hot-movies-series');
}

function getTrending(page, perPage) {
  const cfgTrend = cfg && cfg.get('api.trending') || {};
  return request('trending', {
    page: page != null ? page : cfgTrend.page ?? 0,
    perPage: perPage || cfgTrend.perPage || 18
  });
}

function getDetails(subjectId) {
  if (!subjectId) throw new Error('subjectId is required');
  return request('item-details', { subjectId });
}

function getRecommendations(subjectId, page, perPage) {
  const cfgRec = cfg && cfg.get('api.recommendations') || {};
  if (!subjectId) throw new Error('subjectId is required');
  return request('recommendations', {
    subjectId,
    page: page || cfgRec.page || 1,
    perPage: perPage || cfgRec.perPage || 24
  });
}

function getMedia(subjectId, detailPath, season, episode) {
  if (!subjectId) throw new Error('subjectId is required');
  if (!detailPath) throw new Error('detailPath is required');
  const params = { subjectId, detailPath };
  if (season !== undefined && season !== null && season !== '') params.season = season;
  if (episode !== undefined && episode !== null && episode !== '') params.episode = episode;
  return request('media', params, { fresh: true });
}

function buildMediaUrl(subjectId, detailPath, season, episode) {
  return buildUrl('media', {
    subjectId,
    detailPath,
    ...(season !== undefined && season !== null && season !== '' ? { season } : {}),
    ...(episode !== undefined && episode !== null && episode !== '' ? { episode } : {})
  });
}

function clearCache() {
  cache.clear();
}

window.CineMind = window.CineMind || {};
window.CineMind.api = {
  apiBase,
  apiKey,
  buildUrl,
  request,
  getHomepage,
  searchMovies,
  getSearchSuggestions,
  getPopularSearches,
  getHotMoviesSeries,
  getTrending,
  getDetails,
  getRecommendations,
  getMedia,
  buildMediaUrl,
  clearCache
};
