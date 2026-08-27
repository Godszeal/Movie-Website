var utils = window.CineMind && window.CineMind.utils;
var components = window.CineMind && window.CineMind.components;
var cfg = window.CineMind && window.CineMind.config;

async function initWatchlist() {
  await cfg.loadConfig();
  renderWatchlist();
}

function renderWatchlist() {
  const container = document.getElementById('watchlist-container');
  if (!container) return;

  const watchlist = utils.getWatchlist();
  if (watchlist.length === 0) {
    container.innerHTML = components.emptyState('Your watchlist is empty. Browse movies and series to add them.', 'fa-bookmark');
    return;
  }

  const itemsHtml = watchlist.map(item => {
    const subjectId = item.subjectId || item.id;
    const detailPath = item.detailPath || '';
    const href = `details.html?id=${encodeURIComponent(subjectId || detailPath)}`;
    return `
      <div class="cs-watchlist-item" data-subject-id="${escapeHtml(String(subjectId || ''))}">
        <a href="${href}" class="cs-watchlist-poster">
          <img src="${escapeHtml(utils.imageUrl(item.poster, utils.placeholderImage(80, 120, 'No Image')))}" alt="${escapeHtml(item.title || 'Unknown')}" loading="lazy" onerror="this.src='${utils.placeholderImage(80, 120, 'No Image')}'" />
        </a>
        <div class="cs-watchlist-info">
          <a href="${href}"><h3 style="font-size: 16px; font-weight: 600; color: var(--color-text); margin-bottom: 4px;">${escapeHtml(item.title || 'Unknown')}</h3></a>
          <p style="font-size: 13px; color: var(--color-muted);">${item.subjectType === 2 ? 'Series' : 'Movie'}</p>
        </div>
        <button class="cs-watchlist-remove" data-subject-id="${escapeHtml(String(subjectId || ''))}" aria-label="Remove from watchlist">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="cs-watchlist-grid">${itemsHtml}</div>`;

  container.querySelectorAll('.cs-watchlist-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const subjectId = btn.getAttribute('data-subject-id');
      removeFromWatchlist(subjectId);
    });
  });
}

function removeFromWatchlist(subjectId) {
  if (!subjectId) return;
  let watchlist = utils.getWatchlist();
  watchlist = watchlist.filter(w => String(w.subjectId) !== String(subjectId));
  utils.setWatchlist(watchlist);
  components.toast('Removed from watchlist', 'info');
  renderWatchlist();
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

document.addEventListener('DOMContentLoaded', initWatchlist);
