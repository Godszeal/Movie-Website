var CONFIG_PATH = '/config.json';

var state = {
  config: null,
  loaded: false,
  error: null,
  loading: false,
  loadPromise: null
};

async function loadConfig() {
  if (state.loadPromise) return state.loadPromise;

  state.loading = true;
  state.loadPromise = (async () => {
    try {
      const separator = CONFIG_PATH.includes('?') ? '&' : '?';
      const response = await fetch(`${CONFIG_PATH}${separator}_config=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (!data || typeof data !== 'object') {
        throw new Error('config.json must be a valid JSON object');
      }
      state.config = data;
      state.loaded = true;
      state.error = null;
      state.loading = false;
      applyBranding(data.branding || {});
      applyTheme(data.theme || {});
      updateMeta(data.site || {}, data.seo || {});
      console.log('[Config] Loaded successfully');
      return data;
    } catch (err) {
      state.error = err;
      state.loaded = false;
      state.loading = false;
      state.loadPromise = null;
      console.error('[Config] Failed to load:', err);
      showConfigError(err.message);
      return null;
    }
  })();

  return state.loadPromise;
}

function getConfig() {
  if (!state.loaded || !state.config) {
    console.warn('[Config] Config not loaded yet');
    return null;
  }
  return state.config;
}

function get(path) {
  const config = getConfig();
  if (!config) return null;
  return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : null), config);
}

function applyBranding(branding) {
  const root = document.documentElement;
  const fields = [
    'primaryColor', 'secondaryColor', 'accentColor',
    'backgroundColor', 'surfaceColor', 'textColor', 'mutedTextColor',
    'borderRadius'
  ];
  fields.forEach(field => {
    if (branding[field]) {
      root.style.setProperty(`--color-${field}`, branding[field]);
    }
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme.mode) root.setAttribute('data-theme', theme.mode);
  if (theme.styleId) root.setAttribute('data-style-id', String(theme.styleId));
  if (theme.allowThemeToggle !== undefined) root.setAttribute('data-allow-theme-toggle', String(theme.allowThemeToggle));
  if (theme.animations !== undefined) root.setAttribute('data-animations', String(theme.animations));
  if (theme.glassmorphism !== undefined) root.setAttribute('data-glassmorphism', String(theme.glassmorphism));
}

function updateMeta(site, seo) {
  site = site || {};
  seo = seo || {};
  const siteName = site.name || site.shortName || 'CineMind';
  const description = site.description || seo.defaultDescription || '';
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const pageTitles = {
    'index.html': site.defaultTitle || `${siteName} - Stream Movies & TV Series`,
    'search.html': `Search - ${siteName}`,
    'watch.html': `Watch - ${siteName}`,
    'watchlist.html': `My Watchlist - ${siteName}`
  };
  const pageTitle = pageTitles[page] || site.defaultTitle || siteName;

  document.title = pageTitle;
  document.documentElement.lang = site.language || 'en';

  const setMeta = (selector, value) => {
    if (!value) return;
    document.querySelectorAll(selector).forEach(element => element.setAttribute('content', value));
  };
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"], meta[name="twitter:title"]', pageTitle);
  setMeta('meta[property="og:description"], meta[name="twitter:description"]', description);
  if (site.favicon || site.logo) {
    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(element => {
      element.setAttribute('href', site.favicon || site.logo);
    });
  }
}

function showConfigError(message) {
  const root = document.getElementById('root') || document.body;
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding: 20px; text-align: center; font-family: sans-serif; color: #ff6b6b; background: #1a1a1a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;';
  errorDiv.innerHTML = `
    <h1 style="font-size: 24px; margin-bottom: 10px;">Configuration Error</h1>
    <p style="color: #b3b3b3; max-width: 500px;">${escapeHtml(message)}</p>
    <p style="color: #666; font-size: 14px; margin-top: 20px;">Please ensure config.json is present and valid.</p>
  `;
  root.appendChild(errorDiv);
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

window.CineMind = window.CineMind || {};
window.CineMind.config = {
  loadConfig,
  getConfig,
  get,
  state
};

loadConfig();
