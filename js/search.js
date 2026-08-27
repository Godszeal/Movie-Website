var api = window.CineMind && window.CineMind.api;
var utils = window.CineMind && window.CineMind.utils;
var components = window.CineMind && window.CineMind.components;
var cfg = window.CineMind && window.CineMind.config;

var currentQuery = '';
var currentPage = 1;
var totalPages = 1;
var currentSubjectType = 'ALL';

async function initSearch() {
  const skeletonContainer = document.getElementById('search-skeleton-cards');
  if (skeletonContainer) skeletonContainer.innerHTML = Array.from({ length: 12 }, () => components.skeletonCard()).join('');
  await cfg.loadConfig();
  const params = new URLSearchParams(window.location.search);
  currentQuery = params.get('q') || '';
  currentPage = parseInt(params.get('page') || '1', 10);
  const typeParam = params.get('type') || '';
  const sectionParam = params.get('section') || '';

  if (typeParam === 'movie') currentSubjectType = 'MOVIE';
  else if (typeParam === 'series') currentSubjectType = 'SERIES';
  else currentSubjectType = 'ALL';

  const queryDisplay = document.getElementById('search-query-display');
  if (queryDisplay && currentQuery) queryDisplay.textContent = `Results for "${currentQuery}"`;
  else if (queryDisplay) queryDisplay.textContent = '';

  const searchInput = document.getElementById('search-page-input');
  if (searchInput && currentQuery) searchInput.value = currentQuery;

  await loadPopularSearches();

  if (sectionParam === 'trending') {
    await loadTrending();
    return;
  }

  if (currentQuery) {
    await loadSearchResults();
  }
}

async function loadTrending() {
  const resultsContainer = document.getElementById('search-results');
  const paginationContainer = document.getElementById('search-pagination');
  const queryDisplay = document.getElementById('search-query-display');
  if (queryDisplay) queryDisplay.textContent = 'Trending Movies & Series';
  if (resultsContainer) resultsContainer.innerHTML = '<div style="display: flex; justify-content: center; padding: 40px;"><div class="cs-player-loading"></div></div>';

  try {
    const data = await api.getTrending(0, cfg.get('api.trending.perPage') || 18);
    const items = (data && data.data && data.data.subjectList) || [];
    if (resultsContainer) {
      if (items.length === 0) {
        resultsContainer.innerHTML = components.emptyState('No trending content available right now.');
      } else {
        const cardsHtml = items.map(item => components.movieCard(item)).join('');
        resultsContainer.innerHTML = `<div class="cs-carousel"><div class="cs-carousel-track">${cardsHtml}</div></div>`;
      }
    }
    if (paginationContainer) paginationContainer.innerHTML = '';
  } catch (err) {
    console.error('Trending error:', err);
    if (resultsContainer) resultsContainer.innerHTML = components.errorState(err.message, loadTrending);
  }
}

async function loadPopularSearches() {
  const container = document.getElementById('popular-searches-container');
  if (!container) return;

  container.innerHTML = '<div class="cs-inline-loading" role="status" aria-label="Loading popular searches"><span class="cs-spinner"></span><span>Loading suggestions…</span></div>';
  try {
    const data = await api.getPopularSearches();
    const searches = (data && data.data && data.data.everyoneSearch) || [];
    if (searches.length === 0) {
      container.innerHTML = '';
      return;
    }
    const chipsHtml = searches.map(s => {
      const title = s.title || s.word || '';
      return `<button class="cs-popular-chip" data-query="${escapeHtml(title)}">${escapeHtml(title)}</button>`;
    }).join('');

    container.innerHTML = `
      <div class="cs-popular-searches">
        <h3 style="font-size: 14px; font-weight: 600; color: var(--color-muted); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Popular Searches</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">${chipsHtml}</div>
      </div>
    `;

    container.querySelectorAll('.cs-popular-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        if (query) window.location.href = `search.html?q=${encodeURIComponent(query)}`;
      });
    });
  } catch (err) {
    console.error('Popular searches error:', err);
    container.innerHTML = '';
  }
}

async function loadSearchResults() {
  const resultsContainer = document.getElementById('search-results');
  const paginationContainer = document.getElementById('search-pagination');
  const loadingContainer = document.getElementById('search-loading');
  const queryDisplay = document.getElementById('search-query-display');

  if (loadingContainer) loadingContainer.style.display = 'block';
  if (resultsContainer) resultsContainer.innerHTML = '';
  if (paginationContainer) paginationContainer.innerHTML = '';

  try {
    const data = await api.searchMovies(currentQuery, currentPage, cfg.get('api.search.perPage') || 24, currentSubjectType);
    const pager = (data && data.data && data.data.pager) || {};
    const items = (data && data.data && data.data.items) || [];
    totalPages = pager.totalCount ? Math.ceil(pager.totalCount / (cfg.get('api.search.perPage') || 24)) : 1;

    if (queryDisplay && currentQuery) {
      const count = pager.totalCount || items.length;
      queryDisplay.textContent = `Results for "${currentQuery}" ${count > 0 ? `(${count})` : ''}`;
    }

    if (loadingContainer) loadingContainer.style.display = 'none';

    if (items.length === 0) {
      if (resultsContainer) resultsContainer.innerHTML = components.emptyState('No results found. Try a different search term.', 'fa-search');
    } else {
      const cardsHtml = items.map(item => components.movieCard(item)).join('');
      if (resultsContainer) resultsContainer.innerHTML = `<div class="cs-carousel"><div class="cs-carousel-track">${cardsHtml}</div></div>`;
    }

    if (paginationContainer) {
      paginationContainer.innerHTML = components.pagination(currentPage, totalPages, (page) => {
        currentPage = page;
        const url = new URL(window.location.href);
        url.searchParams.set('page', String(page));
        window.history.pushState({}, '', url);
        loadSearchResults();
      });
    }
  } catch (err) {
    console.error('Search error:', err);
    if (loadingContainer) loadingContainer.style.display = 'none';
    if (resultsContainer) resultsContainer.innerHTML = components.errorState(err.message, loadSearchResults);
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

const searchInput = document.getElementById('search-page-input');
if (searchInput) {
  const debouncedSearch = utils.debounce(async (query) => {
    if (query.length >= 2) {
      currentQuery = query;
      currentPage = 1;
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      url.searchParams.set('page', '1');
      window.history.pushState({}, '', url);
      await loadSearchResults();
    }
  }, 500);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length === 0) {
      currentQuery = '';
      document.getElementById('search-results').innerHTML = '';
      return;
    }
    debouncedSearch(query);
  });
}

document.addEventListener('DOMContentLoaded', initSearch);
