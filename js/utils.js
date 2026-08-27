var cfg = window.CineMind && window.CineMind.config;

function get(path) {
  return cfg && cfg.get ? cfg.get(path) : null;
}

function getSiteName() {
  return get('site.name') || get('site.shortName') || 'CineMind';
}

function resolveField(obj, candidates) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of candidates) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }
  }
  return null;
}

function getTitle(item) {
  return resolveField(item, ['title', 'name', 'originalTitle', 'original_title', 'postTitle']);
}

function getDescription(item) {
  return resolveField(item, ['description', 'overview', 'plot', 'summary']);
}

function getPoster(item) {
  const cover = resolveField(item, ['cover', 'poster', 'posterUrl', 'poster_url', 'image', 'imageUrl', 'coverUrl', 'cover_url']);
  if (!cover) return null;
  if (typeof cover === 'string') return cover;
  return resolveField(cover, ['url', 'href', 'src']) || null;
}

function getBackdrop(item) {
  const image = resolveField(item, ['image', 'backdrop', 'backdropUrl', 'backdrop_url', 'background', 'backgroundUrl', 'stills', 'poster', 'cover']);
  if (!image) return null;
  if (typeof image === 'string') return image;
  return resolveField(image, ['url', 'href', 'src']) || null;
}

function getSubjectId(item) {
  return resolveField(item, ['subjectId', 'subject_id', 'id']);
}

function getDetailPath(item) {
  return resolveField(item, ['detailPath', 'detail_path', 'slug', 'path']);
}

function getRating(item) {
  return resolveField(item, ['rating', 'score', 'imdbRatingValue', 'voteAverage', 'vote_average']);
}

function getYear(item) {
  const date = resolveField(item, ['releaseDate', 'release_date', 'year']);
  if (!date) return null;
  if (typeof date === 'number') return String(date);
  const str = String(date);
  if (str.length >= 4 && /^\d{4}/.test(str)) return str.substring(0, 4);
  return str;
}

function getGenres(item) {
  const genre = resolveField(item, ['genre', 'genres', 'category']);
  if (!genre) return [];
  if (Array.isArray(genre)) return genre.filter(Boolean);
  return String(genre).split(',').map(g => g.trim()).filter(Boolean);
}

function getDuration(item) {
  return resolveField(item, ['duration', 'runtime', 'length']);
}

function getCountry(item) {
  return resolveField(item, ['countryName', 'country', 'country_name']);
}

function getSubjectType(item) {
  return resolveField(item, ['subjectType', 'subject_type', 'type']);
}

function unwrapProxyTarget(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (/\/api\/proxy(?:-download)?$/.test(parsed.pathname)) return parsed.searchParams.get('url') || url;
  } catch {}
  return url;
}

function proxyUrl(url) {
  if (!url) return null;
  url = unwrapProxyTarget(url);
  if (url.startsWith('/')) return url;
  const configuredProxy = window.CineMind?.config?.get?.('api.proxyUrl') || '/api/proxy';
  const separator = configuredProxy.includes('?') ? '&' : '?';
  return configuredProxy + separator + 'url=' + encodeURIComponent(url) + '&_cinemind_proxy_ts=' + Date.now();
}

function withDownloadFilename(url, title, season, episode, quality) {
  if (!url) return null;
  try {
    const rawUrl = unwrapProxyTarget(url);
    const target = new URL(rawUrl, window.location.origin);
    const selectedQuality = quality || target.searchParams.get('quality') || 'best';
    const safeTitle = String(title || `${getSiteName()} Movie`).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
    const suffix = season && episode ? ` - S${season}E${episode}` : '';
    const filename = `${safeTitle}${suffix} - ${selectedQuality}.mp4`;
    const proxied = new URL(proxyUrl(target.toString()), window.location.origin);
    proxied.searchParams.set('name', filename);
    return proxied.toString();
  } catch {
    return url;
  }
}

function withSubtitleFilename(url, title, season, episode, language) {
  if (!url) return null;
  try {
    const safeTitle = String(title || `${getSiteName()} Movie`).replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
    const safeLanguage = String(language || 'subtitle').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
    const suffix = season && episode ? ` - S${season}E${episode}` : '';
    const proxied = new URL(proxyUrl(unwrapProxyTarget(url)), window.location.origin);
    proxied.searchParams.set('name', `${safeTitle}${suffix} - ${safeLanguage}.srt`);
    return proxied.toString();
  } catch {
    return url;
  }
}

function unwrapMedia(mediaData) {
  return mediaData?.data || mediaData || {};
}

function normalizeQuality(value, fallback = 'best') {
  if (value === null || value === undefined || value === '') return fallback;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return `${text}p`;
  if (/^\d+p$/i.test(text)) return text.toLowerCase();
  return text;
}

function unwrapMediaCollection(mediaData, kind) {
  const source = unwrapMedia(mediaData);
  const envelope = source[kind === 'stream' ? 'stream' : 'downloads'] || source[kind === 'stream' ? 'streams' : 'download'] || source;
  return envelope?.data?.data || envelope?.data || envelope;
}

function getMediaVariants(mediaData, kind = 'stream') {
  const data = unwrapMediaCollection(mediaData, kind);
  const keys = kind === 'stream'
    ? ['streams', 'stream', 'streamUrl', 'stream_url', 'videoUrl', 'video_url', 'url']
    : ['downloads', 'download', 'downloadUrl', 'download_url'];
  const collection = resolveField(data, keys);
  if (!collection) return [];
  const entries = Array.isArray(collection) ? collection : [collection];
  const variants = entries.map((item, index) => {
    const rawUrl = typeof item === 'string' ? item : resolveField(item, kind === 'stream'
      ? ['url', 'href', 'src', 'streamUrl', 'stream_url', 'videoUrl', 'video_url']
      : ['downloadUrl', 'download_url', 'url', 'href', 'src', 'streamUrl']);
    if (!rawUrl) return null;
    const resolution = typeof item === 'object' ? resolveField(item, ['resolution', 'resolutions', 'quality', 'definition']) : null;
    const quality = normalizeQuality(resolution || (typeof item === 'object' ? resolveField(item, ['name', 'label']) : null), `source-${index + 1}`);
    return {
      ...(item && typeof item === 'object' ? item : {}),
      rawUrl: unwrapProxyTarget(rawUrl),
      url: proxyUrl(rawUrl),
      quality,
      resolution: resolution || quality,
      size: typeof item === 'object' ? resolveField(item, ['size', 'fileSize', 'file_size']) : null,
      duration: typeof item === 'object' ? resolveField(item, ['duration', 'length']) : null,
      format: typeof item === 'object' ? resolveField(item, ['format', 'mimeType', 'mime_type']) : null
    };
  }).filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const variant of variants) {
    const key = `${variant.quality}|${variant.rawUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(variant);
  }
  return unique.sort((a, b) => {
    const av = parseInt(String(a.resolution).match(/\d+/)?.[0] || '0', 10);
    const bv = parseInt(String(b.resolution).match(/\d+/)?.[0] || '0', 10);
    return bv - av;
  });
}

function getStreamSources(url) {
  const upstreamUrl = unwrapProxyTarget(url);
  if (!upstreamUrl) return [];
  const providerProxy = 'https://api.zstlab.cyou/api/proxy?url=' + encodeURIComponent(upstreamUrl) + '&_cinemind_proxy_ts=' + Date.now();
  return [...new Set([proxyUrl(upstreamUrl), providerProxy, upstreamUrl])];
}

function getStreamCandidates(mediaData) {
  const best = getMediaVariants(mediaData, 'stream')[0];
  return best ? getStreamSources(best.rawUrl) : [];
}

function getStreamUrl(mediaData) {
  return getStreamCandidates(mediaData)[0] || null;
}

function getDownloadVariants(mediaData) {
  return getMediaVariants(mediaData, 'download');
}

function getDownloadUrl(mediaData) {
  return getDownloadVariants(mediaData)[0]?.url || null;
}

function getSubtitles(mediaData) {
  const source = unwrapMedia(mediaData);
  const envelope = source.subtitles || source.subtitle || source;
  const subtitleData = envelope?.data?.data || envelope?.data || envelope;
  return resolveField(subtitleData, ['subtitles', 'subtitle', 'captions', 'tracks']) || [];
}

function getSubtitleTracks(mediaData) {
  const tracks = getSubtitles(mediaData);
  return (Array.isArray(tracks) ? tracks : [tracks]).filter(Boolean).map((track, index) => {
    const url = resolveField(track, ['url', 'downloadUrl', 'download_url', 'src']);
    const language = resolveField(track, ['lan', 'language', 'lang', 'srclang']) || `track-${index + 1}`;
    const label = resolveField(track, ['lanName', 'languageName', 'label', 'name']) || language;
    return { ...track, url: url ? proxyUrl(url) : null, language: String(language), label: String(label) };
  }).filter(track => track.url);
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatRating(rating) {
  if (rating === null || rating === undefined) return null;
  const num = parseFloat(rating);
  if (isNaN(num)) return null;
  return num.toFixed(1);
}

function imageUrl(url, fallback) {
  if (!url) return fallback || '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

function placeholderImage(width, height, text) {
  width = width || 300;
  height = height || 450;
  text = text || 'No Image';
  return `https://via.placeholder.com/${width}x${height}/1f1f1f/ffffff?text=${encodeURIComponent(text)}`;
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = n;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function storage(key, defaultValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn('[Storage] Failed to save to localStorage');
  }
}

function isTypeSeries(item) {
  const type = getSubjectType(item);
  return type === 2 || type === 'series' || type === 'tv';
}

function isTypeMovie(item) {
  const type = getSubjectType(item);
  return type === 1 || type === 'movie' || type === 'film';
}

function getWatchlist() {
  try {
    const data = localStorage.getItem('cinemind_watchlist');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setWatchlist(watchlist) {
  try {
    localStorage.setItem('cinemind_watchlist', JSON.stringify(watchlist));
  } catch {
    console.warn('[Storage] Failed to save watchlist');
  }
}

function isInWatchlist(subjectId) {
  if (!subjectId) return false;
  return getWatchlist().some(w => String(w.subjectId) === String(subjectId));
}

window.CineMind = window.CineMind || {};
window.CineMind.utils = {
  get,
  resolveField,
  getTitle,
  getSiteName,
  getDescription,
  getPoster,
  getBackdrop,
  getSubjectId,
  getDetailPath,
  getRating,
  getYear,
  getGenres,
  getDuration,
  getCountry,
  getSubjectType,
  getStreamUrl,
  getStreamCandidates,
  getStreamSources,
  getMediaVariants,
  getDownloadVariants,
  getDownloadUrl,
  withDownloadFilename,
  withSubtitleFilename,
  getSubtitles,
  getSubtitleTracks,
  formatDuration,
  formatRating,
  imageUrl,
  placeholderImage,
  debounce,
  escapeHtml,
  formatBytes,
  storage,
  setStorage,
  isTypeSeries,
  isTypeMovie,
  getWatchlist,
  setWatchlist,
  isInWatchlist
};
