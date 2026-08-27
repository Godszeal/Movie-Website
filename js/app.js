var cfg = window.CineMind && window.CineMind.config;
var api = window.CineMind && window.CineMind.api;
var utils = window.CineMind && window.CineMind.utils;
var components = window.CineMind && window.CineMind.components;

async function initApp() {
  const config = await cfg.loadConfig();
  if (!config) return;
  initSiteIdentity(config);
  initNavigation();
  initSearchSuggestions();
  initMobileMenu();
  initWatchlistNav();
  initFooter();
}

function initSiteIdentity(config) {
  const site = config.site || {};
  const footer = config.footer || {};
  const siteName = site.name || site.shortName || 'CineMind';
  const description = site.description || (config.seo && config.seo.defaultDescription) || '';

  document.querySelectorAll('[data-site-name]').forEach(element => {
    element.textContent = siteName;
  });
  document.querySelectorAll('[data-site-description]').forEach(element => {
    element.textContent = description;
  });

  const footerText = document.getElementById('footer-text');
  if (footerText && footer.text) {
    footerText.textContent = footer.text
      .replace(/\{siteName\}/g, siteName)
      .replace(/CineMind/g, siteName);
  }

}

function initNavigation() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.cs-nav-links a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkPage = href.split('/').pop() || 'index.html';
    if (currentPage === linkPage || (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    }
  });
}

function initSearchSuggestions() {
  const searchInputs = document.querySelectorAll('.cs-search-input');
  const suggestionContainers = {};

  searchInputs.forEach(input => {
    const containerId = input.id === 'search-page-input' ? 'search-page-suggestions' : 'nav-search-suggestions';
    const container = document.getElementById(containerId);
    if (!container) return;

    suggestionContainers[input.id] = container;
    const debouncedFetch = utils.debounce(async (query) => {
      if (query.length < (cfg.get('api.searchSuggestions.minimumCharacters') || 2)) {
        container.innerHTML = '';
        return;
      }
      try {
        const data = await api.getSearchSuggestions(query, cfg.get('api.searchSuggestions.perPage') || 10);
        renderSuggestions(container, data, input);
      } catch (err) {
        console.error('Search suggestions error:', err);
      }
    }, cfg.get('api.searchSuggestions.debounce') || 350);

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      debouncedFetch(query);
    });

    input.addEventListener('keydown', (e) => {
      const items = container.querySelectorAll('.cs-suggestion-item');
      const active = container.querySelector('.cs-suggestion-item.active');
      let index = Array.from(items).indexOf(active);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        index = Math.min(index + 1, items.length - 1);
        updateActiveSuggestion(items, index);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        index = Math.max(index - 1, 0);
        updateActiveSuggestion(items, index);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active) {
          active.click();
        } else if (query.length >= 2) {
          navigateToSearch(input.value.trim());
        }
      } else if (e.key === 'Escape') {
        container.innerHTML = '';
        input.blur();
      }
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        debouncedFetch(input.value.trim());
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.cs-search-box')) {
      Object.values(suggestionContainers).forEach(c => {
        c.innerHTML = '';
        c.classList.remove('open');
      });
    }
  });
}

function updateActiveSuggestion(items, index) {
  items.forEach(item => item.classList.remove('active'));
  if (items[index]) {
    items[index].classList.add('active');
    items[index].scrollIntoView({ block: 'nearest' });
  }
}
function renderSuggestions(container, data, input) {
  const items = (data && data.data && data.data.items) || [];
  if (items.length === 0) {
    container.innerHTML = '';
    container.classList.remove('open');
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const word = item.word || item.title || item.name || '';
    return `<div class="cs-suggestion-item" data-query="${escapeHtml(word)}" data-index="${index}">${escapeHtml(word)}</div>`;
  }).join('');
  container.classList.add('open');

  container.querySelectorAll('.cs-suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      const query = el.getAttribute('data-query');
      input.value = query;
      container.innerHTML = '';
      container.classList.remove('open');
      navigateToSearch(query);
    });
  });
}

function navigateToSearch(query) {
  if (!query || query.trim().length === 0) return;
  window.location.href = `search.html?q=${encodeURIComponent(query.trim())}`;
}

function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links') || document.querySelector('.cs-nav-links');
  const nav = document.querySelector('.cs-nav');
  if (!btn || !navLinks) return;

  const setOpen = (open) => {
    navLinks.classList.toggle('mobile-open', open);
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  btn.type = 'button';
  btn.setAttribute('aria-controls', navLinks.id || 'nav-links');
  setOpen(false);
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(!navLinks.classList.contains('mobile-open'));
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (nav && !nav.contains(event.target)) setOpen(false);
  });
}

function initWatchlistNav() {
  const btn = document.getElementById('watchlist-nav-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.location.href = 'watchlist.html';
  });
}

function initFooter() {
  const footerText = document.getElementById('footer-text');
  if (!footerText) return;
  const footerConfig = cfg.get('footer') || {};
  const siteName = cfg.get('site.name') || cfg.get('site.shortName') || 'CineMind';
  if (footerConfig.text) {
    footerText.textContent = footerConfig.text
      .replace(/\{siteName\}/g, siteName)
      .replace(/CineMind/g, siteName);
  }
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

function showToast(message, type, duration) {
  components.toast(message, type, duration);
}

function formatDuration(seconds) {
  return utils.formatDuration(seconds);
}

function formatRating(rating) {
  return utils.formatRating(rating);
}

document.addEventListener('DOMContentLoaded', initApp);
