var api = window.CineMind && window.CineMind.api;
var utils = window.CineMind && window.CineMind.utils;
var components = window.CineMind && window.CineMind.components;
var cfg = window.CineMind && window.CineMind.config;

var currentItem = null;
var currentSubjectId = null;
var currentDetailPath = null;
var currentSeason = 1;
var currentEpisode = 1;
var isSeries = false;
var mediaRequestId = 0;

async function initDetails() {
  await cfg.loadConfig();
  const params = new URLSearchParams(window.location.search);
  currentSubjectId = params.get('id');

  if (!currentSubjectId) {
    showInvalidId();
    return;
  }

  const contentEl = document.getElementById('details-content');
  const loadingEl = document.getElementById('details-loading');
  const errorEl = document.getElementById('details-error');

  if (loadingEl) loadingEl.style.display = 'block';
  if (contentEl) contentEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  try {
    const data = await api.getDetails(currentSubjectId);
    const detailData = (data && data.data) || data || {};
    const subject = detailData.subject || detailData.item || detailData.subjectInfo || detailData;
    if (!subject || !utils.getTitle(subject)) {
      showInvalidId();
      return;
    }

    currentItem = subject;
    currentDetailPath = utils.getDetailPath(subject);
    isSeries = utils.isTypeSeries(subject) || detailData.isSeries === true || detailData.isSeries === 1 || detailData.subjectType === 2;
    const availableSeasons = detailData.seasons || subject.seasons || subject.episodeList || [];
    if (isSeries && availableSeasons.length) currentSeason = Math.min(Math.max(currentSeason, 1), availableSeasons.length);

    renderDetails(subject, detailData);
    updateSEO(subject);

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
  } catch (err) {
    console.error('Details error:', err);
    components.toast(err.message || 'Unable to load title details.', 'error');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.querySelector('p').textContent = err.message || 'Something went wrong.';
    }
  }
}

function showInvalidId() {
  const loadingEl = document.getElementById('details-loading');
  const contentEl = document.getElementById('details-content');
  const errorEl = document.getElementById('details-error');
  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'block';
}

function renderDetails(subject, fullData) {
  const container = document.getElementById('details-content');
  if (!container) return;

  const title = utils.getTitle(subject) || 'Unknown';
  const description = utils.getDescription(subject) || '';
  const poster = utils.getPoster(subject);
  const backdrop = utils.getBackdrop(subject) || poster;
  const rating = utils.getRating(subject);
  const year = utils.getYear(subject);
  const genres = utils.getGenres(subject);
  const country = utils.getCountry(subject);
  const duration = utils.getDuration(subject);
  const subjectType = utils.getSubjectType(subject);
  const stars = (fullData && fullData.stars) || [];
  const subjectId = utils.getSubjectId(subject);
  const inWatchlist = utils.isInWatchlist(subjectId);

  const trailer = (subject && subject.trailer && subject.trailer.videoAddress && subject.trailer.videoAddress.url) ? subject.trailer.videoAddress.url : null;

  container.innerHTML = `
    <div class="cs-details-hero" style="background-image: url('${escapeHtml(utils.imageUrl(backdrop, ''))}')">
      <div class="cs-details-gradient"></div>
      <div class="cs-details-content">
        <div class="cs-details-poster">
          <img src="${escapeHtml(utils.imageUrl(poster, utils.placeholderImage()))}" alt="${escapeHtml(title)}" onerror="this.src='${utils.placeholderImage()}'" />
        </div>
        <div class="cs-details-info">
          <h1 class="cs-details-title">${escapeHtml(title)}</h1>
          <div class="cs-details-meta">
            ${year ? `<span>${escapeHtml(year)}</span>` : ''}
            ${rating ? `<span><i class="fas fa-star"></i> ${utils.formatRating(rating)}</span>` : ''}
            ${duration ? `<span>${utils.formatDuration(duration)}</span>` : ''}
            ${subjectType === 1 ? '<span>Movie</span>' : subjectType === 2 ? '<span>Series</span>' : ''}
            ${country ? `<span>${escapeHtml(country)}</span>` : ''}
          </div>
          ${genres.length > 0 ? `<div class="cs-details-genres">${genres.map(g => `<span class="cs-genre-tag">${escapeHtml(g)}</span>`).join('')}</div>` : ''}
          ${description ? `<p class="cs-details-desc">${escapeHtml(description)}</p>` : ''}
          <div class="cs-details-actions">
            <button class="cs-btn cs-btn-primary" id="watch-now-btn"><i class="fas fa-play"></i> Watch Now</button>
            ${trailer ? `<button class="cs-btn cs-btn-secondary" id="trailer-btn"><i class="fas fa-film"></i> Trailer</button>` : ''}
            <button class="cs-btn cs-btn-ghost" id="add-watchlist-btn"><i class="fas fa-${inWatchlist ? 'check' : 'bookmark'}"></i> ${inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</button>
            <button class="cs-btn cs-btn-ghost" id="download-movie-btn" type="button"><i class="fas fa-download"></i> Download Movie</button>
            <button class="cs-btn cs-btn-ghost" id="share-btn"><i class="fas fa-share-alt"></i> Share</button>
          </div>
        </div>
      </div>
    </div>
    <div class="cs-section">
      <div class="cs-container">
        ${renderStars(stars)}
        ${isSeries ? renderSeriesInfo(subject, fullData) : ''}
        <div class="cs-media-details-panel" id="media-details-panel" aria-live="polite">
          <div class="cs-section-heading"><h3>Media &amp; Subtitles</h3><span>Loading availability…</span></div>
          <div class="cs-inline-loading"><span class="cs-spinner cs-spinner-sm"></span> Checking downloads and subtitle languages…</div>
        </div>
        <div id="recommendations-container"></div>
      </div>
    </div>

    ${trailer ? `
    <div id="trailer-modal" class="cs-trailer-modal" style="display: none;" role="dialog" aria-modal="true" aria-label="Trailer" aria-hidden="true">
      <div class="cs-trailer-backdrop"></div>
      <div class="cs-trailer-content">
        <button type="button" class="cs-trailer-close" id="trailer-close" aria-label="Close trailer"><i class="fas fa-times" aria-hidden="true"></i></button>
        <div class="cs-trailer-wrap">
          <video class="cs-trailer-player" id="trailer-player" controls playsinline>
            <track kind="subtitles" srclang="en" label="English" default />
          </video>
        </div>
      </div>
    </div>
    ` : ''}
  `;

  document.getElementById('watch-now-btn')?.addEventListener('click', (event) => {
    streamEpisode(subjectId, currentDetailPath, isSeries ? currentSeason : undefined, isSeries ? currentEpisode : undefined, title, event.currentTarget);
  });

  document.getElementById('trailer-btn')?.addEventListener('click', () => {
    if (trailer) openTrailer(trailer);
  });

  document.getElementById('add-watchlist-btn')?.addEventListener('click', () => {
    toggleWatchlist(subject);
  });

  document.getElementById('share-btn')?.addEventListener('click', () => {
    shareDetails(title, window.location.href);
  });

  document.getElementById('download-movie-btn')?.addEventListener('click', (event) => {
    downloadEpisode(subjectId, currentDetailPath, isSeries ? currentSeason : undefined, isSeries ? currentEpisode : undefined, event.currentTarget);
  });

  initTrailerEvents();

  document.getElementById('episode-list')?.addEventListener('click', (e) => {
    const subtitleBtn = e.target.closest('.cs-episode-subtitles');
    const downloadBtn = e.target.closest('.cs-episode-download');
    const btn = e.target.closest('.cs-episode-btn');
    const target = subtitleBtn || downloadBtn || btn;
    if (!target) return;
    const season = target.getAttribute('data-season');
    const episode = target.getAttribute('data-episode');
    const detailPath = target.getAttribute('data-detail-path');
    if (!season || !episode || !subjectId) return;
    currentSeason = Number(season) || 1;
    currentEpisode = Number(episode) || 1;
    if (subtitleBtn) {
      loadEpisodeSubtitles(subject, title, target.closest('.cs-episode-row'), currentSeason, currentEpisode, detailPath);
      return;
    }
    loadMediaAvailability(subject, title);
    if (downloadBtn) {
      downloadEpisode(subjectId, detailPath, currentSeason, currentEpisode, downloadBtn);
      return;
    }
    streamEpisode(subjectId, detailPath, currentSeason, currentEpisode, title, btn);
  });

  loadMediaAvailability(subject, title);
  loadRecommendations(subjectId);
}

async function setActionBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.classList.add('is-loading');
    button.innerHTML = '<span class="cs-spinner cs-spinner-sm"></span> Preparing…';
  } else {
    button.disabled = false;
    button.classList.remove('is-loading');
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

async function chooseMediaQuality(subjectId, detailPath, season, episode, title, mode, button) {
  await setActionBusy(button, true);
  components.toast('Checking available qualities…', 'info', 1800);
  try {
    const media = await api.getMedia(subjectId, detailPath, season, episode);
    const variants = mode === 'stream'
      ? (utils.getMediaVariants ? utils.getMediaVariants(media, 'stream') : [])
      : (utils.getDownloadVariants ? utils.getDownloadVariants(media) : []);
    if (!variants.length) throw new Error(`${mode === 'stream' ? 'Streaming' : 'Download'} quality is not available for this title or episode.`);
    return await components.chooseQuality({ mode, title: `${title}${season && episode ? ` · S${season}E${episode}` : ''}`, variants });
  } catch (error) {
    console.error(`Quality ${mode} error:`, error);
    components.toast(error.message || `Unable to load ${mode} qualities.`, 'error');
    return null;
  } finally {
    await setActionBusy(button, false);
  }
}

async function streamEpisode(subjectId, detailPath, season, episode, title, button) {
  const selected = await chooseMediaQuality(subjectId, detailPath, season, episode, title, 'stream', button);
  if (!selected) return;
  const query = new URLSearchParams({ id: String(subjectId || ''), detailPath: String(detailPath || ''), quality: String(selected.quality || selected.resolution || '') });
  if (season && episode) { query.set('season', String(season)); query.set('episode', String(episode)); }
  window.location.href = `watch.html?${query.toString()}`;
}

async function loadMediaAvailability(subject, title) {
  const panel = document.getElementById('media-details-panel');
  if (!panel || !currentDetailPath) return;
  const season = isSeries ? currentSeason : undefined;
  const episode = isSeries ? currentEpisode : undefined;
  const requestId = ++mediaRequestId;
  panel.innerHTML = `<div class="cs-section-heading"><h3>Media &amp; Subtitles</h3><span>Loading availability…</span></div><div class="cs-inline-loading"><span class="cs-spinner cs-spinner-sm"></span> Checking downloads and subtitle languages…</div>`;
  try {
    const media = await api.getMedia(currentSubjectId, currentDetailPath, season, episode);
    if (requestId !== mediaRequestId) return;
    const downloadVariants = utils.getDownloadVariants ? utils.getDownloadVariants(media) : [];
    const subtitleTracks = utils.getSubtitleTracks ? utils.getSubtitleTracks(media) : [];
    panel.innerHTML = `
      <div class="cs-section-heading"><h3>Media &amp; Subtitles</h3><span>${isSeries ? `Season ${season} · Episode ${episode}` : 'Movie'}</span></div>
      <div class="cs-media-availability">
        ${downloadVariants.length ? `<button type="button" id="media-download-btn" class="cs-btn cs-btn-primary cs-media-download"><i class="fas fa-download"></i> Choose Download Quality <small>(${downloadVariants.length})</small></button>` : '<span class="cs-media-unavailable">Download unavailable for this title.</span>'}
        <div class="cs-subtitle-list"><strong><i class="fas fa-closed-captioning"></i> Subtitles</strong>
          ${subtitleTracks.length ? subtitleTracks.map(track => { const subtitleUrl = utils.withSubtitleFilename ? utils.withSubtitleFilename(track.url, title, season, episode, track.label || track.language, track.format) : track.url; return `<a class="cs-subtitle-chip" href="${escapeHtml(subtitleUrl)}" download title="Download ${escapeHtml(track.label)} subtitle"><span>${escapeHtml(track.label)}</span><small>${escapeHtml(track.language)}</small><i class="fas fa-download"></i></a>`; }).join('') : '<span class="cs-media-unavailable">No subtitles available.</span>'}
        </div>
      </div>`;
    panel.querySelector('#media-download-btn')?.addEventListener('click', event => downloadEpisode(currentSubjectId, currentDetailPath, season, episode, event.currentTarget));
  } catch (err) {
    panel.innerHTML = '<div class="cs-section-heading"><h3>Media &amp; Subtitles</h3></div><div class="cs-media-unavailable">Media availability could not be loaded. You can still use the episode controls above.</div>';
  }
}

function renderStars(stars) {
  if (!stars || stars.length === 0) return '';
  const cast = stars.filter(s => s.staffType === 1).slice(0, 10);
  const directors = stars.filter(s => s.staffType === 2).slice(0, 5);
  const writers = stars.filter(s => s.staffType === 3).slice(0, 5);

  return `
    <div style="margin-top: 40px;">
      ${cast.length > 0 ? `
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 20px;">Cast</h3>
        <div class="cs-cast-scroll" style="display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px;">
          ${cast.map(star => `
            <div style="flex: 0 0 auto; width: 120px; text-align: center;">
              <img src="${escapeHtml(utils.imageUrl(star.avatarUrl, utils.placeholderImage(120, 120, 'No Photo')))}" alt="${escapeHtml(star.name)}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; background: var(--color-surface);" loading="lazy" onerror="this.src='${utils.placeholderImage(120, 120, 'No Photo')}'" />
              <div style="font-size: 13px; font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(star.name)}</div>
              <div style="font-size: 12px; color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(star.character || '')}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${directors.length > 0 ? `
        <h3 style="font-size: 18px; font-weight: 600; margin: 24px 0 12px;">Directors</h3>
        <p style="color: var(--color-muted); font-size: 14px;">${directors.map(d => escapeHtml(d.name)).join(', ')}</p>
      ` : ''}
      ${writers.length > 0 ? `
        <h3 style="font-size: 18px; font-weight: 600; margin: 24px 0 12px;">Writers</h3>
        <p style="color: var(--color-muted); font-size: 14px;">${writers.map(w => escapeHtml(w.name)).join(', ')}</p>
      ` : ''}
    </div>
  `;
}

function normalizeSeasonEpisodes(season) {
  if (!season || typeof season !== 'object') return [];
  const explicit = season.episodes || season.episodeList || season.subjectList || season.items || season.contents;
  if (Array.isArray(explicit) && explicit.length) return explicit;
  const maxEp = Number(season.maxEp || season.episodeCount || season.episodeNum || 0);
  if (maxEp > 0) return Array.from({ length: maxEp }, (_, index) => ({ episodeNumber: index + 1 }));
  return [season];
}

function renderSeriesInfo(subject, fullData) {
  const seasons = (fullData && fullData.seasons) || subject.seasons || subject.episodeList || [];
  if (!Array.isArray(seasons) || seasons.length === 0) return '';

  return `
    <div class="cs-details-episodes">
      <div class="cs-section-heading"><h3>Episodes</h3><span>${seasons.length} season${seasons.length === 1 ? '' : 's'}</span></div>
      <div class="cs-episode-list" id="episode-list">
        ${seasons.map((season, sIndex) => {
          const seasonNumber = Number(season.se || season.season || season.seasonNumber || sIndex + 1);
          const episodes = normalizeSeasonEpisodes(season);
          return `
            <section class="cs-season-block" aria-labelledby="season-${seasonNumber}-title">
              <h4 id="season-${seasonNumber}-title">${escapeHtml(season.title || season.name || `Season ${seasonNumber}`)}</h4>
              <div class="cs-episode-items">
                ${episodes.map((ep, eIndex) => {
                  const episodeNumber = Number(ep.episodeNumber || ep.epNum || ep.number || eIndex + 1);
                  const epTitle = ep.title || ep.name || `Episode ${episodeNumber}`;
                  const epDesc = ep.description || ep.overview || '';
                  const epDuration = ep.duration || ep.runtime || 0;
                  const epPoster = utils.getPoster(ep) || utils.getPoster(subject);
                  const attrs = `data-season="${seasonNumber}" data-episode="${episodeNumber}" data-detail-path="${escapeHtml(currentDetailPath || '')}"`;
                  return `
                    <div class="cs-episode-row">
                      <button type="button" class="cs-episode-btn" ${attrs} aria-label="Watch ${escapeHtml(epTitle)}">
                        <div class="cs-episode-thumb"><img src="${escapeHtml(utils.imageUrl(epPoster, utils.placeholderImage(160, 90, 'No Preview')))}" alt="${escapeHtml(epTitle)}" loading="lazy" onerror="this.src='${utils.placeholderImage(160, 90, 'No Preview')}'" /></div>
                        <div class="cs-episode-info"><div class="cs-episode-title">${escapeHtml(epTitle)}</div>${epDesc ? `<div class="cs-episode-desc">${escapeHtml(String(epDesc).substring(0, 120))}${String(epDesc).length > 120 ? '...' : ''}</div>` : ''}${epDuration ? `<div class="cs-episode-meta">${utils.formatDuration(epDuration)}</div>` : ''}</div>
                        <span class="cs-episode-play"><i class="fas fa-play" aria-hidden="true"></i></span>
                      </button>
                      <div class="cs-episode-actions">
                        <button type="button" class="cs-episode-download cs-btn cs-btn-sm" ${attrs} aria-label="Download ${escapeHtml(epTitle)}" title="Download ${escapeHtml(epTitle)}"><i class="fas fa-download" aria-hidden="true"></i><span>Download</span></button>
                        <button type="button" class="cs-episode-subtitles cs-btn cs-btn-sm" ${attrs} aria-label="Download subtitles for ${escapeHtml(epTitle)}" title="Download subtitles for ${escapeHtml(epTitle)}"><i class="fas fa-closed-captioning" aria-hidden="true"></i><span>Subtitles</span></button>
                      </div>
                      <div class="cs-episode-subtitle-panel" hidden aria-live="polite"></div>
                    </div>
                  `;
                }).join('')}
              </div>
            </section>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function loadEpisodeSubtitles(subject, title, row, season, episode, detailPath) {
  const panel = row?.querySelector('.cs-episode-subtitle-panel');
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = '<span class="cs-spinner cs-spinner-sm"></span><span>Loading subtitle languages…</span>';
  try {
    const media = await api.getMedia(currentSubjectId, detailPath || currentDetailPath, season, episode);
    const tracks = utils.getSubtitleTracks ? utils.getSubtitleTracks(media) : [];
    if (!tracks.length) {
      panel.innerHTML = '<span class="cs-media-unavailable">No subtitles are available for this episode.</span>';
      return;
    }
    panel.innerHTML = `<div class="cs-episode-subtitle-heading"><i class="fas fa-closed-captioning"></i> Subtitle languages</div><div class="cs-episode-subtitle-links">${tracks.map(track => { const href = utils.withSubtitleFilename ? utils.withSubtitleFilename(track.url, title, season, episode, track.label || track.language, track.format) : track.url; return `<a href="${escapeHtml(href)}" download class="cs-subtitle-chip" title="Download ${escapeHtml(track.label)} subtitle"><span>${escapeHtml(track.label)}</span><small>${escapeHtml(track.language)}</small><i class="fas fa-download"></i></a>`; }).join('')}</div>`;
  } catch (err) {
    console.error('Episode subtitles error:', err);
    panel.innerHTML = '<span class="cs-media-unavailable">Subtitle languages could not be loaded. Try again.</span>';
  }
}

async function downloadEpisode(subjectId, detailPath, season, episode, triggerButton) {
  const button = triggerButton || document.getElementById('download-movie-btn');
  const title = utils.getTitle(currentItem) || `${utils.getSiteName ? utils.getSiteName() : (cfg.get('site.name') || 'CineMind')} Movie`;
  const selected = await chooseMediaQuality(subjectId, detailPath, season, episode, title, 'download', button);
  if (!selected) return;
  const url = utils.withDownloadFilename(selected.url, title, season, episode, selected.quality);
  if (!url) {
    components.toast('Download is not available for this title or episode.', 'error');
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.download = '';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  components.toast(`Download started (${selected.quality}).`, 'success', 2200);
}

async function loadRecommendations(subjectId) {
  const container = document.getElementById('recommendations-container');
  if (!container) return;

  container.innerHTML = '<div style="padding: 40px; text-align: center;"><div class="cs-player-loading"></div></div>';

  try {
    const data = await api.getRecommendations(subjectId, cfg.get('api.recommendations.page') || 1, cfg.get('api.recommendations.perPage') || 24);
    const items = (data && data.data && data.data.items) || [];
    if (items.length === 0) {
      container.innerHTML = components.emptyState('No recommendations available.', 'fa-thumbs-up');
    } else {
      const cardsHtml = items.map(item => components.movieCard(item)).join('');
      container.innerHTML = `
        <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 20px;">You May Also Like</h3>
        <div class="cs-carousel"><div class="cs-carousel-track">${cardsHtml}</div></div>
      `;
      initCarousels();
    }
  } catch (err) {
    console.error('Recommendations error:', err);
    container.innerHTML = '';
  }
}

function updateSEO(subject) {
  const title = utils.getTitle(subject) || 'Unknown';
  const description = utils.getDescription(subject) || '';
  const poster = utils.getPoster(subject);
  const backdrop = utils.getBackdrop(subject) || poster;
  const siteName = cfg.get('site.name') || cfg.get('site.shortName') || 'CineMind';
  const fallbackDescription = cfg.get('site.description') || cfg.get('seo.defaultDescription') || `Watch movies and TV series on ${siteName}.`;
  const titleTemplate = cfg.get('seo.titleTemplate') || '{title} | {siteName}';
  const pageTitle = titleTemplate
    .replace(/\{title\}/g, title)
    .replace(/\{siteName\}/g, siteName)
    .replace(/\{name\}/g, siteName);

  document.title = pageTitle;

  const metaDesc = document.getElementById('meta-description');
  if (metaDesc) metaDesc.setAttribute('content', description || fallbackDescription);

  const ogTitle = document.getElementById('og-title');
  if (ogTitle) ogTitle.setAttribute('content', title);

  const ogDesc = document.getElementById('og-description');
  if (ogDesc) ogDesc.setAttribute('content', description || fallbackDescription);

  const ogImage = document.getElementById('og-image');
  if (ogImage) ogImage.setAttribute('content', utils.imageUrl(poster || backdrop, '/assets/favicon.png'));

  const twitterTitle = document.getElementById('twitter-title');
  if (twitterTitle) twitterTitle.setAttribute('content', title);

  const twitterDesc = document.getElementById('twitter-description');
  if (twitterDesc) twitterDesc.setAttribute('content', description || fallbackDescription);

  const twitterImage = document.getElementById('twitter-image');
  if (twitterImage) twitterImage.setAttribute('content', utils.imageUrl(poster || backdrop, '/assets/favicon.png'));

  const favicon = document.getElementById('favicon');
  if (favicon && poster) {
    favicon.setAttribute('href', utils.imageUrl(poster, '/assets/favicon.png'));
  }
}

function shareDetails(title, url) {
  const shareData = {
    title: title,
    text: `Watch ${title} on ${cfg.get('site.name') || cfg.get('site.shortName') || 'CineMind'}`,
    url: url
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => copyToClipboard(url));
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    components.toast('Link copied!', 'success');
  }).catch(() => {
    components.toast('Unable to copy link', 'error');
  });
}

function toggleWatchlist(item) {
  const subjectId = utils.getSubjectId(item);
  if (!subjectId) return;
  let watchlist = utils.getWatchlist();
  const exists = watchlist.some(w => w.subjectId === subjectId);
  if (exists) {
    watchlist = watchlist.filter(w => w.subjectId !== subjectId);
    components.toast('Removed from watchlist', 'info');
  } else {
    watchlist.push({
      subjectId: subjectId,
      title: utils.getTitle(item) || 'Unknown',
      poster: utils.getPoster(item) || '',
      detailPath: utils.getDetailPath(item) || '',
      subjectType: utils.getSubjectType(item) || 1,
      addedAt: Date.now()
    });
    components.toast('Added to watchlist', 'success');
  }
  utils.setWatchlist(watchlist);
  const btn = document.getElementById('add-watchlist-btn');
  if (btn) {
    const inWatchlist = watchlist.some(w => w.subjectId === subjectId);
    btn.innerHTML = `<i class="fas fa-${inWatchlist ? 'check' : 'bookmark'}"></i> ${inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}`;
  }
}

function initCarousels() {
  document.querySelectorAll('.cs-carousel').forEach(carousel => {
    const track = carousel.querySelector('.cs-carousel-track');
    if (!track) return;
    const prevBtn = carousel.parentElement.querySelector('.cs-carousel-prev');
    const nextBtn = carousel.parentElement.querySelector('.cs-carousel-next');
    if (prevBtn) prevBtn.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * 0.7, behavior: 'smooth' }));
    if (nextBtn) nextBtn.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.7, behavior: 'smooth' }));
  });
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

function openTrailer(trailerUrl) {
  const modal = document.getElementById('trailer-modal');
  const player = document.getElementById('trailer-player');
  if (!modal || !player || !trailerUrl) return;

  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  player.src = trailerUrl;
  player.load();
  player.play().catch(() => {});
  document.getElementById('trailer-close')?.focus();
}

function closeTrailer() {
  const modal = document.getElementById('trailer-modal');
  const player = document.getElementById('trailer-player');
  if (!modal || !player) return;

  player.pause();
  player.removeAttribute('src');
  player.load();
  modal.style.display = 'none';
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function initTrailerEvents() {
  const closeBtn = document.getElementById('trailer-close');
  const modal = document.getElementById('trailer-modal');
  if (!modal || modal.dataset.bound === 'true') return;
  modal.dataset.bound = 'true';
  if (closeBtn) closeBtn.addEventListener('click', closeTrailer);
  modal.querySelector('.cs-trailer-backdrop')?.addEventListener('click', closeTrailer);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeTrailer();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeTrailer();
  });
}

document.addEventListener('DOMContentLoaded', initDetails);
document.addEventListener('DOMContentLoaded', initTrailerEvents);
