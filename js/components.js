var cfg = window.CineMind && window.CineMind.config;
var utils = window.CineMind && window.CineMind.utils;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function movieCard(item, options) {
  options = options || {};
  const subjectId = utils.getSubjectId(item);
  const title = utils.getTitle(item) || 'Unknown';
  const poster = utils.getPoster(item);
  const year = utils.getYear(item);
  const rating = utils.getRating(item);
  const subjectType = utils.getSubjectType(item);
  const isSeries = utils.isTypeSeries(item);
  const detailPath = utils.getDetailPath(item);
  const fallback = options.fallback || '';

  if (!subjectId && !detailPath) return '';

  const href = `details.html?id=${encodeURIComponent(subjectId || detailPath)}`;
  const badge = isSeries ? '<span class="cs-badge cs-badge-series">Series</span>' : '<span class="cs-badge cs-badge-movie">Movie</span>';

  return `
    <a href="${href}" class="cs-movie-card" data-subject-id="${escapeHtml(String(subjectId || ''))}" data-detail-path="${escapeHtml(String(detailPath || ''))}">
      <div class="cs-card-poster">
        <img src="${escapeHtml(utils.imageUrl(poster, fallback))}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='${fallback || utils.placeholderImage()}'" />
        <div class="cs-card-overlay">
          <div class="cs-card-play"><i class="fas fa-play"></i></div>
        </div>
        ${badge}
        ${rating ? `<span class="cs-card-rating"><i class="fas fa-star"></i> ${utils.formatRating(rating)}</span>` : ''}
      </div>
      <div class="cs-card-info">
        <h3 class="cs-card-title">${escapeHtml(title)}</h3>
        <div class="cs-card-meta">
          ${year ? `<span>${escapeHtml(year)}</span>` : ''}
          ${subjectType === 1 ? '<span>Movie</span>' : subjectType === 2 ? '<span>Series</span>' : ''}
        </div>
      </div>
    </a>
  `;
}

function carouselSection(title, items, options) {
  options = options || {};
  if (!items || items.length === 0) return '';
  const cardsHtml = items.map(item => movieCard(item, options)).join('');
  const sectionId = options.id || 'carousel-' + Math.random().toString(36).substring(2, 9);
  return `
    <section class="cs-carousel-section" data-section="${escapeHtml(title)}">
      <div class="cs-section-header">
        <h2 class="cs-section-title">${escapeHtml(title)}</h2>
        <div class="cs-carousel-nav">
          <button class="cs-carousel-btn cs-carousel-prev" data-target="${sectionId}" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>
          <button class="cs-carousel-btn cs-carousel-next" data-target="${sectionId}" aria-label="Next"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
      <div class="cs-carousel" id="${sectionId}">
        <div class="cs-carousel-track">${cardsHtml}</div>
      </div>
    </section>
  `;
}

function heroCarousel(items, options) {
  options = options || {};
  if (!items || items.length === 0) return '';
  const slides = items.map((item, index) => {
    const title = utils.getTitle(item) || 'Featured';
    const description = utils.getDescription(item) || '';
    const backdrop = utils.getBackdrop(item);
    const poster = utils.getPoster(item);
    const rating = utils.getRating(item);
    const year = utils.getYear(item);
    const subjectId = utils.getSubjectId(item);
    const detailPath = utils.getDetailPath(item);
    const href = `details.html?id=${encodeURIComponent(subjectId || detailPath)}`;
    const activeClass = index === 0 ? 'active' : '';
    return `
      <div class="cs-hero-slide ${activeClass}" data-index="${index}">
        <div class="cs-hero-backdrop" style="background-image: url('${escapeHtml(utils.imageUrl(backdrop, poster || ''))}')"></div>
        <div class="cs-hero-gradient"></div>
        <div class="cs-hero-content">
          <h1 class="cs-hero-title">${escapeHtml(title)}</h1>
          <div class="cs-hero-meta">
            ${year ? `<span>${escapeHtml(year)}</span>` : ''}
            ${rating ? `<span><i class="fas fa-star"></i> ${utils.formatRating(rating)}</span>` : ''}
          </div>
          <p class="cs-hero-desc">${escapeHtml(description.substring(0, 200))}${description.length > 200 ? '...' : ''}</p>
          <div class="cs-hero-actions">
            <a href="${href}" class="cs-btn cs-btn-primary"><i class="fas fa-play"></i> Watch Now</a>
            <a href="${href}" class="cs-btn cs-btn-secondary"><i class="fas fa-info-circle"></i> Details</a>
          </div>
        </div>
      </div>
    `;
  }).join('');
  return `
    <section class="cs-hero" data-carousel="true">
      <div class="cs-hero-slides">${slides}</div>
      <div class="cs-hero-dots" id="hero-dots"></div>
    </section>
  `;
}

function skeletonCard() {
  return `
    <div class="cs-movie-card cs-skeleton">
      <div class="cs-card-poster cs-skeleton-poster"></div>
      <div class="cs-card-info">
        <div class="cs-skeleton-title"></div>
        <div class="cs-skeleton-meta"></div>
      </div>
    </div>
  `;
}

function skeletonHero() {
  return `
    <div class="cs-hero cs-skeleton">
      <div class="cs-hero-backdrop cs-skeleton-backdrop"></div>
      <div class="cs-hero-gradient"></div>
      <div class="cs-hero-content">
        <div class="cs-skeleton-title" style="width: 60%; height: 40px; margin-bottom: 12px;"></div>
        <div class="cs-skeleton-meta" style="width: 40%; height: 20px; margin-bottom: 16px;"></div>
        <div class="cs-skeleton-desc" style="width: 100%; height: 16px; margin-bottom: 8px;"></div>
        <div class="cs-skeleton-desc" style="width: 80%; height: 16px; margin-bottom: 24px;"></div>
        <div class="cs-skeleton-actions" style="display: flex; gap: 12px;">
          <div style="width: 120px; height: 44px; border-radius: 8px;"></div>
          <div style="width: 120px; height: 44px; border-radius: 8px;"></div>
        </div>
      </div>
    </div>
  `;
}

function toast(message, type, duration) {
  type = type || 'info';
  duration = duration || 3500;
  const container = document.getElementById('toast-container') || createToastContainer();
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const toastEl = document.createElement('div');
  toastEl.className = `cs-toast cs-toast-${type}`;
  toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toastEl.innerHTML = `
    <i class="fas ${icons[type] || icons.info} cs-toast-icon" aria-hidden="true"></i>
    <span class="cs-toast-message">${escapeHtml(message)}</span>
    <button class="cs-toast-close" type="button" aria-label="Dismiss notification"><i class="fas fa-times" aria-hidden="true"></i></button>
    <span class="cs-toast-progress" aria-hidden="true"></span>
  `;
  const dismiss = () => {
    toastEl.classList.remove('cs-toast-show');
    setTimeout(() => toastEl.remove(), 220);
  };
  toastEl.querySelector('.cs-toast-close').addEventListener('click', dismiss);
  container.appendChild(toastEl);
  requestAnimationFrame(() => toastEl.classList.add('cs-toast-show'));
  const timer = setTimeout(dismiss, duration);
  toastEl.addEventListener('mouseenter', () => clearTimeout(timer), { once: true });
}

function chooseQuality(options) {
  options = options || {};
  const variants = Array.isArray(options.variants) ? options.variants : [];
  if (!variants.length) return Promise.resolve(null);
  return new Promise(resolve => {
    const existing = document.getElementById('quality-modal');
    existing?.remove();
    const mode = options.mode === 'stream' ? 'stream' : 'download';
    const overlay = document.createElement('div');
    overlay.id = 'quality-modal';
    overlay.className = 'cs-quality-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'quality-modal-title');
    const title = options.title || 'Choose quality';
    const action = mode === 'stream' ? 'Stream' : 'Download';
    overlay.innerHTML = `
      <div class="cs-quality-backdrop" data-quality-close="true"></div>
      <section class="cs-quality-dialog">
        <button type="button" class="cs-quality-close" aria-label="Close quality selector" data-quality-close="true"><i class="fas fa-times"></i></button>
        <div class="cs-quality-kicker"><i class="fas fa-sliders"></i> ${action} quality</div>
        <h2 id="quality-modal-title">${escapeHtml(title)}</h2>
        <p class="cs-quality-description">Choose the video quality you want to ${mode === 'stream' ? 'watch' : 'download'}.</p>
        <div class="cs-quality-options">
          ${variants.map((variant, index) => `
            <button type="button" class="cs-quality-option" data-quality-index="${index}">
              <span class="cs-quality-option-main"><strong>${escapeHtml(String(variant.quality || variant.resolution || `Option ${index + 1}`))}</strong><small>${escapeHtml(String(variant.format || 'MP4'))}</small></span>
              <span class="cs-quality-option-meta">${variant.size && utils?.formatBytes ? escapeHtml(utils.formatBytes(variant.size)) : ''}<i class="fas fa-chevron-right" aria-hidden="true"></i></span>
            </button>`).join('')}
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.classList.remove('is-open');
      setTimeout(() => overlay.remove(), 180);
      resolve(value);
    };
    const onKeyDown = event => { if (event.key === 'Escape') finish(null); };
    document.addEventListener('keydown', onKeyDown);
    overlay.addEventListener('click', event => {
      const close = event.target.closest('[data-quality-close]');
      if (close) { finish(null); return; }
      const option = event.target.closest('[data-quality-index]');
      if (option) finish(variants[Number(option.dataset.qualityIndex)] || null);
    });
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    overlay.querySelector('.cs-quality-option')?.focus();
  });
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'cs-toast-container';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');
  document.body.appendChild(container);
  return container;
}

function errorState(message, retryFn) {
  const retryButton = retryFn ? `<button class="cs-btn cs-btn-primary" onclick="(${retryFn.toString()})()"><i class="fas fa-redo"></i> Retry</button>` : '';
  return `
    <div class="cs-error-state">
      <i class="fas fa-exclamation-circle"></i>
      <h3>Something went wrong</h3>
      <p>${escapeHtml(message)}</p>
      ${retryButton}
    </div>
  `;
}

function emptyState(message, icon) {
  icon = icon || 'fa-film';
  return `
    <div class="cs-empty-state">
      <i class="fas ${icon}"></i>
      <h3>${escapeHtml(message)}</h3>
    </div>
  `;
}

function pagination(currentPage, totalPages, onPageChange) {
  if (totalPages <= 1) return '';
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  if (currentPage > 1) {
    pages.push(`<button class="cs-page-btn" data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`);
  }
  for (let i = start; i <= end; i++) {
    pages.push(`<button class="cs-page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
  }
  if (currentPage < totalPages) {
    pages.push(`<button class="cs-page-btn" data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`);
  }
  return `<nav class="cs-pagination" aria-label="Pagination">${pages.join('')}</nav>`;
}

window.CineMind = window.CineMind || {};
window.CineMind.components = {
  movieCard,
  carouselSection,
  heroCarousel,
  skeletonCard,
  skeletonHero,
  toast,
  chooseQuality,
  errorState,
  emptyState,
  pagination
};
