var api = window.CineMind && window.CineMind.api;
var utils = window.CineMind && window.CineMind.utils;
var components = window.CineMind && window.CineMind.components;
var cfg = window.CineMind && window.CineMind.config;

var currentMedia = null;
var currentSubject = null;
var currentSubjectId = null;
var currentDetailPath = null;
var currentSeason = 0;
var currentEpisode = 0;
var isSeries = false;
var currentSeasons = [];
var videoElement = null;
let playerWrap = null;
let subtitleRequestId = 0;
let subtitleObjectUrl = null;

async function initPlayer() {
  components.toast('Loading player…', 'info', 1800);
  await cfg.loadConfig();
  const params = new URLSearchParams(window.location.search);
  currentSubjectId = params.get('id');
  currentSeason = parseInt(params.get('season') || '0', 10);
  currentEpisode = parseInt(params.get('episode') || '0', 10);

  const loadingEl = document.getElementById('watch-loading');
  const errorEl = document.getElementById('watch-error');
  const contentEl = document.getElementById('watch-content');

  if (!currentSubjectId) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.querySelector('p').textContent = 'No content ID provided.';
    }
    return;
  }

  if (loadingEl) loadingEl.style.display = 'block';
  if (contentEl) contentEl.style.display = 'none';

  try {
    const detailsData = await api.getDetails(currentSubjectId);
    const subject = (detailsData && detailsData.data && detailsData.data.subject) || null;
    if (!subject) throw new Error('Content not found');

    currentSubject = subject;
    currentDetailPath = utils.getDetailPath(subject);
    isSeries = utils.isTypeSeries(subject);
    currentSeasons = detailsData.data.seasons || subject.seasons || subject.episodeList || [];

    if (isSeries) {
      if (currentSeason === 0) currentSeason = 1;
      if (currentEpisode === 0) currentEpisode = 1;
    } else {
      currentSeason = 0;
      currentEpisode = 0;
    }

    await loadMedia();

    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    renderPlayerInfo(subject, detailsData.data);
  } catch (err) {
    console.error('Player error:', err);
    components.toast(err.message || 'Unable to load this title.', 'error');
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) {
      errorEl.style.display = 'block';
      errorEl.querySelector('p').textContent = err.message || 'Something went wrong.';
    }
  }
}

async function loadMedia() {
  const contentEl = document.getElementById('watch-content');
  if (!contentEl) return;

  contentEl.innerHTML = `
    <div class="cs-player-wrap paused" id="player-wrap">
      <video class="cs-player" id="video-player" playsinline></video>
      <div class="cs-player-loading"></div>
      <div class="cs-player-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Unable to load video</p>
      </div>
      <div class="cs-player-center">
        <button class="cs-player-big-play" id="big-play-btn" aria-label="Play"><i class="fas fa-play"></i></button>
      </div>
      <div class="cs-player-controls" id="player-controls">
        <div class="cs-player-progress" id="progress-bar">
          <div class="cs-player-buffered" id="buffered-bar"></div>
          <div class="cs-player-progress-fill" id="progress-fill"></div>
        </div>
        <div class="cs-player-row">
          <div class="cs-player-left">
            <button class="cs-player-btn" id="play-pause-btn" aria-label="Play"><i class="fas fa-play"></i></button>
            <span class="cs-player-time" id="current-time">00:00</span>
            <span class="cs-player-time" style="opacity: 0.6;">/</span>
            <span class="cs-player-time" id="duration">00:00</span>
          </div>
          <div class="cs-player-right">
            <div class="cs-player-volume">
              <button class="cs-player-btn" id="mute-btn" aria-label="Mute"><i class="fas fa-volume-up"></i></button>
              <input type="range" class="cs-player-volume-slider" id="volume-slider" min="0" max="1" step="0.05" value="1" />
            </div>
            <button class="cs-player-btn" id="speed-btn" aria-label="Playback speed">1x</button>
            <button class="cs-player-btn cs-quality-player-btn" id="quality-btn" aria-label="Video quality" title="Video quality">Auto</button>
            <button class="cs-player-btn" id="subtitle-btn" aria-label="Subtitles"><i class="fas fa-closed-captioning"></i></button>
            <button class="cs-player-btn cs-download-btn" id="download-btn" aria-label="Download movie" title="Download movie" type="button"><i class="fas fa-download"></i><span class="cs-download-label">Download</span></button>
            <button class="cs-player-btn" id="prev-episode-btn" aria-label="Previous" style="display: none;"><i class="fas fa-step-backward"></i></button>
            <button class="cs-player-btn" id="next-episode-btn" aria-label="Next episode" style="display: none;"><i class="fas fa-step-forward"></i></button>
            <button class="cs-player-btn" id="fullscreen-btn" aria-label="Fullscreen"><i class="fas fa-expand"></i></button>
          </div>
        </div>
      </div>
      <div class="cs-speed-menu" id="speed-menu">
        <div class="cs-speed-item" data-speed="0.5">0.5x</div>
        <div class="cs-speed-item" data-speed="0.75">0.75x</div>
        <div class="cs-speed-item active" data-speed="1">1x</div>
        <div class="cs-speed-item" data-speed="1.25">1.25x</div>
        <div class="cs-speed-item" data-speed="1.5">1.5x</div>
        <div class="cs-speed-item" data-speed="2">2x</div>
      </div>
      <div class="cs-subtitle-menu" id="subtitle-menu"></div>
    </div>
    <div id="media-info" style="margin-top: 20px;"></div>
  `;

  try {
    const mediaData = await api.getMedia(currentSubjectId, currentDetailPath, currentSeason, currentEpisode);
    currentMedia = mediaData;
    setupPlayer(mediaData);
  } catch (err) {
    console.error('Media error:', err);
    components.toast('The video could not be loaded. Try another episode or retry.', 'error');
    playerWrap = document.getElementById('player-wrap');
    if (playerWrap) playerWrap.classList.add('error');
  }
}

function setupPlayer(mediaData) {
  videoElement = document.getElementById('video-player');
  playerWrap = document.getElementById('player-wrap');
  if (!videoElement || !playerWrap) return;

  const streamVariants = utils.getMediaVariants ? utils.getMediaVariants(mediaData, 'stream') : [];
  const downloadVariants = utils.getDownloadVariants ? utils.getDownloadVariants(mediaData) : [];
  const requestedQuality = new URLSearchParams(window.location.search).get('quality');
  const qualityMatches = variant => requestedQuality && String(variant.quality || variant.resolution).toLowerCase().replace(/p$/, '') === String(requestedQuality).toLowerCase().replace(/p$/, '');
  let selectedStream = streamVariants.find(qualityMatches) || streamVariants[0] || null;
  let streamCandidates = selectedStream && utils.getStreamSources ? utils.getStreamSources(selectedStream.rawUrl) : (utils.getStreamCandidates ? utils.getStreamCandidates(mediaData) : [utils.getStreamUrl(mediaData)].filter(Boolean));
  let streamIndex = 0;
  const subtitles = utils.getSubtitleTracks ? utils.getSubtitleTracks(mediaData) : utils.getSubtitles(mediaData);
  const qualityBtn = document.getElementById('quality-btn');
  const setQualityLabel = quality => { if (qualityBtn) qualityBtn.textContent = quality || 'Auto'; };
  setQualityLabel(selectedStream?.quality || 'Auto');

  const applyStreamVariant = variant => {
    if (!variant || !videoElement) return;
    const wasPlaying = !videoElement.paused;
    selectedStream = variant;
    streamCandidates = utils.getStreamSources ? utils.getStreamSources(variant.rawUrl) : [variant.url].filter(Boolean);
    streamIndex = 0;
    setQualityLabel(variant.quality || variant.resolution || 'Auto');
    playerWrap.classList.add('loading');
    playerWrap.classList.remove('error');
    videoElement.src = streamCandidates[0] || '';
    videoElement.load();
    if (wasPlaying) videoElement.addEventListener('canplay', () => videoElement.play().catch(() => {}), { once: true });
  };

  if (streamCandidates[0]) {
    videoElement.src = streamCandidates[0];
    videoElement.load();
  }

  if (qualityBtn && streamVariants.length) {
    qualityBtn.disabled = false;
    qualityBtn.addEventListener('click', async event => {
      event.stopPropagation();
      const selected = await components.chooseQuality({ mode: 'stream', title: `${utils.getTitle(currentSubject) || 'Video'}${isSeries ? ` · S${currentSeason}E${currentEpisode}` : ''}`, variants: streamVariants });
      if (selected) applyStreamVariant(selected);
    });
  } else if (qualityBtn) {
    qualityBtn.disabled = true;
    qualityBtn.title = 'Video quality is not available';
  }

  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    if (downloadVariants.length) {
      downloadBtn.disabled = false;
      downloadBtn.addEventListener('click', async event => {
        event.stopPropagation();
        const fallbackTitle = `${utils.getSiteName ? utils.getSiteName() : (cfg.get('site.name') || 'CineMind')} Movie`;
        const selected = await components.chooseQuality({ mode: 'download', title: `${utils.getTitle(currentSubject) || fallbackTitle}${isSeries ? ` · S${currentSeason}E${currentEpisode}` : ''}`, variants: downloadVariants });
        if (!selected) return;
        const url = utils.withDownloadFilename(selected.url, utils.getTitle(currentSubject) || fallbackTitle, isSeries ? currentSeason : undefined, isSeries ? currentEpisode : undefined, selected.quality);
        if (!url) { components.toast('Download is not available for this episode.', 'error'); return; }
        components.toast(`Preparing ${selected.quality} download…`, 'info', 1800);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.download = '';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      });
    } else {
      downloadBtn.disabled = true;
      downloadBtn.title = 'Download is not available for this episode';
      downloadBtn.setAttribute('aria-label', 'Download unavailable');
    }
  }

  setupSubtitles(subtitles);
  setupPlayerControls();
  setupNextPrevButtons();

  videoElement.addEventListener('loadedmetadata', () => {
    const durationEl = document.getElementById('duration');
    if (durationEl) durationEl.textContent = formatTime(videoElement.duration);
  });

  videoElement.addEventListener('timeupdate', () => {
    if (!videoElement) return;
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    if (progressFill) {
      const pct = (videoElement.currentTime / videoElement.duration) * 100;
      progressFill.style.width = `${pct}%`;
    }
    if (currentTimeEl) currentTimeEl.textContent = formatTime(videoElement.currentTime);
    savePlaybackPosition();
  });

  videoElement.addEventListener('progress', () => {
    if (!videoElement || !videoElement.buffered.length) return;
    const bufferedBar = document.getElementById('buffered-bar');
    if (bufferedBar) {
      const end = videoElement.buffered.end(videoElement.buffered.length - 1);
      const pct = (end / videoElement.duration) * 100;
      bufferedBar.style.width = `${pct}%`;
    }
  });

  videoElement.addEventListener('play', () => {
    playerWrap.classList.remove('paused');
    const btn = document.getElementById('play-pause-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
  });

  videoElement.addEventListener('pause', () => {
    playerWrap.classList.add('paused');
    const btn = document.getElementById('play-pause-btn');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i>';
  });

  videoElement.addEventListener('waiting', () => playerWrap.classList.add('loading'));
  videoElement.addEventListener('canplay', () => playerWrap.classList.remove('loading'));
  videoElement.addEventListener('error', () => {
    if (streamIndex < streamCandidates.length - 1) {
      streamIndex += 1;
      playerWrap.classList.add('loading');
      playerWrap.classList.remove('error');
      videoElement.src = streamCandidates[streamIndex];
      videoElement.load();
      return;
    }
    playerWrap.classList.add('error');
    components.toast('This video source is unavailable. Try another episode.', 'error');
  });

  const backBtn = document.getElementById('back-to-details');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = `details.html?id=${encodeURIComponent(currentSubjectId || '')}`;
    });
  }
}

function setupSubtitles(subtitles) {
  const menu = document.getElementById('subtitle-menu');
  const btn = document.getElementById('subtitle-btn');
  if (!menu || !btn) return;
  menu.innerHTML = '';

  const offOption = document.createElement('div');
  offOption.className = 'cs-subtitle-item active';
  offOption.textContent = 'Off';
  offOption.addEventListener('click', () => {
    disableSubtitles();
    menu.querySelectorAll('.cs-subtitle-item').forEach(i => i.classList.remove('active'));
    offOption.classList.add('active');
  });
  menu.appendChild(offOption);

  if (subtitles && subtitles.length > 0) {
    subtitles.forEach((sub, index) => {
      const option = document.createElement('div');
      option.className = 'cs-subtitle-item';
      option.textContent = sub.label || sub.language || `Subtitle ${index + 1}`;
      option.addEventListener('click', () => {
        enableSubtitles(sub);
        menu.querySelectorAll('.cs-subtitle-item').forEach(i => i.classList.remove('active'));
        option.classList.add('active');
        menu.classList.remove('open');
      });
      menu.appendChild(option);
    });
    btn.style.display = 'flex';
  } else {
    btn.style.display = 'none';
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('speed-menu')?.classList.remove('open');
    menu.classList.toggle('open');
  });
}

function clearSubtitleTracks() {
  if (!videoElement) return;
  videoElement.querySelectorAll('track').forEach(track => track.remove());
  if (videoElement.textTracks) {
    Array.from(videoElement.textTracks).forEach(track => { track.mode = 'disabled'; });
  }
}

function isWebVtt(text) {
  return /^\s*WEBVTT(?:\s|$)/i.test(text || '');
}

function isSubRipTrack(subtitle, text) {
  const source = `${subtitle?.url || ''} ${subtitle?.src || ''} ${subtitle?.format || ''} ${subtitle?.type || ''}`;
  return /\.srt(?:[?#]|$)|subrip|x-subrip/i.test(source) || /(?:^|\n)\s*\d+\s*\n\s*\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->/.test(text || '');
}

function subRipToWebVtt(text) {
  const normalized = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const lines = normalized.split('\n').map(line => line.replace(/(\d{1,3}:\d{2}:\d{2}),([0-9]{3})/g, '$1.$2'));
  return `WEBVTT\n\n${lines.join('\n')}\n`;
}

function subtitleDelaySeconds(subtitle) {
  const raw = Number(subtitle?.delay ?? subtitle?.offset ?? 0);
  if (!Number.isFinite(raw) || raw === 0) return 0;
  return Math.abs(raw) >= 100 ? raw / 1000 : raw;
}

function parseSubtitleTimestamp(value) {
  const match = String(value || '').trim().match(/^(\d{1,3}):(\d{2}):(\d{2})[.,](\d{3})$/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function formatSubtitleTimestamp(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const milliseconds = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function shiftSubtitleTimes(text, offsetSeconds) {
  if (!offsetSeconds) return text;
  return String(text).replace(/(\d{1,3}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,3}:\d{2}:\d{2}[.,]\d{3})/g, (line, start, end) => {
    const startTime = parseSubtitleTimestamp(start);
    const endTime = parseSubtitleTimestamp(end);
    if (startTime === null || endTime === null) return line;
    return `${formatSubtitleTimestamp(startTime + offsetSeconds)} --> ${formatSubtitleTimestamp(endTime + offsetSeconds)}`;
  });
}

function prepareSubtitleText(subtitle, text) {
  const source = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const vtt = isWebVtt(source) ? source : subRipToWebVtt(source);
  const shifted = shiftSubtitleTimes(vtt, subtitleDelaySeconds(subtitle));
  return shifted.endsWith('\n') ? shifted : `${shifted}\n`;
}

async function enableSubtitles(subtitle) {
  if (!videoElement) return;
  const requestId = ++subtitleRequestId;
  clearSubtitleTracks();
  if (subtitleObjectUrl) {
    URL.revokeObjectURL(subtitleObjectUrl);
    subtitleObjectUrl = null;
  }

  const sourceUrl = subtitle?.url || subtitle?.src;
  if (!sourceUrl) return;

  try {
    const response = await fetch(sourceUrl, {
      cache: 'no-store',
      headers: { Accept: 'text/vtt,text/plain,application/x-subrip,*/*' }
    });
    if (!response.ok) throw new Error(`Subtitle request failed (${response.status})`);
    const text = await response.text();
    if (requestId !== subtitleRequestId || !videoElement) return;

    const needsTransform = isSubRipTrack(subtitle, text) || !isWebVtt(text) || subtitleDelaySeconds(subtitle) !== 0;
    let trackUrl = sourceUrl;
    if (needsTransform) {
      subtitleObjectUrl = URL.createObjectURL(new Blob([prepareSubtitleText(subtitle, text)], { type: 'text/vtt' }));
      trackUrl = subtitleObjectUrl;
    }

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = subtitle.label || subtitle.language || 'Subtitles';
    track.srclang = String(subtitle.language || 'en').slice(0, 8).toLowerCase();
    track.src = trackUrl;
    track.default = true;
    track.addEventListener('error', () => components.toast('This subtitle track could not be displayed.', 'error'), { once: true });
    videoElement.appendChild(track);

    const showTrack = (attempt = 0) => {
      if (requestId !== subtitleRequestId || !videoElement.textTracks) return;
      const textTrack = track.track || Array.from(videoElement.textTracks).find(item => item.label === track.label && item.language === track.srclang);
      if (!textTrack && attempt < 12) { setTimeout(() => showTrack(attempt + 1), 100); return; }
      Array.from(videoElement.textTracks).forEach(item => { item.mode = item === textTrack ? 'showing' : 'disabled'; });
    };
    track.addEventListener('load', () => showTrack(), { once: true });
    setTimeout(() => showTrack(), 50);
  } catch (error) {
    console.error('Subtitle error:', error);
    if (requestId === subtitleRequestId) components.toast('Unable to load this subtitle language.', 'error');
  }
}

function disableSubtitles() {
  subtitleRequestId += 1;
  clearSubtitleTracks();
  if (subtitleObjectUrl) {
    URL.revokeObjectURL(subtitleObjectUrl);
    subtitleObjectUrl = null;
  }
}

function setupPlayerControls() {
  const playPauseBtn = document.getElementById('play-pause-btn');
  const bigPlayBtn = document.getElementById('big-play-btn');
  const progressBar = document.getElementById('progress-bar');
  const muteBtn = document.getElementById('mute-btn');
  const volumeSlider = document.getElementById('volume-slider');
  const speedBtn = document.getElementById('speed-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const speedMenu = document.getElementById('speed-menu');

  playPauseBtn?.addEventListener('click', togglePlay);
  bigPlayBtn?.addEventListener('click', togglePlay);
  videoElement?.addEventListener('click', togglePlay);

  progressBar?.addEventListener('click', (e) => {
    if (!videoElement || !videoElement.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoElement.currentTime = pct * videoElement.duration;
  });

  muteBtn?.addEventListener('click', () => {
    if (!videoElement) return;
    videoElement.muted = !videoElement.muted;
    muteBtn.innerHTML = videoElement.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
  });

  volumeSlider?.addEventListener('input', (e) => {
    if (!videoElement) return;
    videoElement.volume = parseFloat(e.target.value);
    videoElement.muted = false;
  });

  speedBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    speedMenu?.classList.toggle('open');
  });

  speedMenu?.querySelectorAll('.cs-speed-item').forEach(item => {
    item.addEventListener('click', () => {
      const speed = parseFloat(item.getAttribute('data-speed') || '1');
      if (videoElement) videoElement.playbackRate = speed;
      speedBtn.textContent = `${speed}x`;
      speedMenu.querySelectorAll('.cs-speed-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      speedMenu.classList.remove('open');
    });
  });

  fullscreenBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      playerWrap?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  document.addEventListener('click', () => {
    speedMenu?.classList.remove('open');
    document.getElementById('subtitle-menu')?.classList.remove('open');
  });

  playerWrap?.addEventListener('dblclick', () => {
    if (!document.fullscreenElement) {
      playerWrap?.requestFullscreen().catch(() => {});
    }
  });
}

function setupNextPrevButtons() {
  const prevBtn = document.getElementById('prev-episode-btn');
  const nextBtn = document.getElementById('next-episode-btn');
  if (!isSeries) return;
  if (prevBtn) {
    prevBtn.style.display = 'flex';
    prevBtn.addEventListener('click', () => {
      if (currentEpisode > 1) {
        window.location.href = `watch.html?id=${encodeURIComponent(currentSubjectId)}&detailPath=${encodeURIComponent(currentDetailPath || '')}&season=${currentSeason}&episode=${currentEpisode - 1}`;
      }
    });
  }
  if (nextBtn) {
    nextBtn.style.display = 'flex';
    nextBtn.addEventListener('click', () => {
      window.location.href = `watch.html?id=${encodeURIComponent(currentSubjectId)}&detailPath=${encodeURIComponent(currentDetailPath || '')}&season=${currentSeason}&episode=${currentEpisode + 1}`;
    });
  }
}

function togglePlay() {
  if (!videoElement) return;
  if (videoElement.paused) videoElement.play().catch(() => {});
  else videoElement.pause();
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function savePlaybackPosition() {
  if (!videoElement || !currentSubjectId) return;
  const key = `cinemind_position_${currentSubjectId}_${currentSeason}_${currentEpisode}`;
  try { localStorage.setItem(key, String(videoElement.currentTime)); } catch {}
}

function renderPlayerInfo(subject, fullData) {
  const infoEl = document.getElementById('media-info');
  if (!infoEl || !subject) return;
  const title = utils.getTitle(subject) || '';
  const seasonEp = isSeries ? `S${currentSeason} E${currentEpisode}` : '';
  infoEl.innerHTML = `
    <div class="cs-media-heading">
      <div>
        <h2 class="cs-media-title">${escapeHtml(title)} ${seasonEp ? `<span class="cs-media-season">${escapeHtml(seasonEp)}</span>` : ''}</h2>
        ${isSeries ? '<p class="cs-media-hint">Choose a season and episode to continue watching.</p>' : ''}
      </div>
      <a href="details.html?id=${encodeURIComponent(currentSubjectId || '')}" class="cs-btn cs-btn-ghost cs-btn-sm"><i class="fas fa-arrow-left"></i> Back to Details</a>
    </div>
    ${isSeries ? renderEpisodePicker(subject, fullData) : ''}
  `;
  bindEpisodePicker();
}

function getSeasonNumber(season, index) {
  return Number(season?.se || season?.season || season?.seasonNumber || index + 1);
}

function getSeasonEpisodes(season) {
  if (!season || typeof season !== 'object') return [];
  const explicit = season.episodes || season.episodeList || season.subjectList || season.items || season.contents;
  if (Array.isArray(explicit) && explicit.length) return explicit;
  const maxEp = Number(season.maxEp || season.episodeCount || season.episodeNum || 0);
  if (maxEp > 0) return Array.from({ length: maxEp }, (_, index) => ({ episodeNumber: index + 1 }));
  return [season];
}

function renderEpisodePicker(subject, fullData) {
  const seasons = fullData?.seasons || subject.seasons || subject.episodeList || [];
  if (!Array.isArray(seasons) || !seasons.length) return '<div class="cs-episode-picker-empty">Episode list is not available for this series.</div>';
  const selectedIndex = Math.max(0, seasons.findIndex((season, index) => getSeasonNumber(season, index) === currentSeason));
  currentSeason = getSeasonNumber(seasons[selectedIndex], selectedIndex);
  return `
    <section class="cs-episode-picker" aria-label="Episode selector">
      <div class="cs-picker-header"><h3>Episodes</h3><span>${seasons.length} season${seasons.length === 1 ? '' : 's'}</span></div>
      <div class="cs-season-tabs" role="tablist">
        ${seasons.map((season, index) => { const number = getSeasonNumber(season, index); return `<button type="button" class="cs-season-tab ${number === currentSeason ? 'active' : ''}" data-season-index="${index}" role="tab" aria-selected="${number === currentSeason}">${escapeHtml(season.title || season.name || `Season ${number}`)}</button>`; }).join('')}
      </div>
      <div class="cs-episode-options">${renderEpisodeOptions(seasons[selectedIndex], currentSeason)}</div>
    </section>
  `;
}

function renderEpisodeOptions(season, seasonNumber) {
  if (!season) return '<p class="cs-episode-picker-empty">No episodes found.</p>';
  const episodes = getSeasonEpisodes(season);
  return episodes.map((episode, index) => {
    const number = Number(episode.episodeNumber || episode.epNum || episode.number || index + 1);
    const active = seasonNumber === currentSeason && number === currentEpisode;
    const label = episode.title || episode.name || `Episode ${number}`;
    return `<button type="button" class="cs-episode-option ${active ? 'active' : ''}" data-episode="${number}" aria-pressed="${active}"><span class="cs-episode-number">${number}</span><span class="cs-episode-option-title">${escapeHtml(label)}</span><i class="fas fa-play" aria-hidden="true"></i></button>`;
  }).join('');
}

function bindEpisodePicker() {
  const picker = document.querySelector('.cs-episode-picker');
  if (!picker) return;
  const seasons = currentSeasons;
  picker.querySelectorAll('.cs-season-tab').forEach(tab => tab.addEventListener('click', () => {
    const index = Number(tab.dataset.seasonIndex);
    const season = seasons[index];
    if (!season) return;
    currentSeason = getSeasonNumber(season, index);
    currentEpisode = 1;
    picker.querySelector('.cs-episode-options').innerHTML = renderEpisodeOptions(season, currentSeason);
    picker.querySelectorAll('.cs-season-tab').forEach((item, i) => {
      const active = i === index;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
    bindEpisodeButtons(picker);
  }));
  bindEpisodeButtons(picker);
}

function bindEpisodeButtons(picker) {
  picker.querySelectorAll('.cs-episode-option').forEach(button => button.addEventListener('click', () => {
    const episode = Number(button.dataset.episode);
    const url = `watch.html?id=${encodeURIComponent(currentSubjectId)}&detailPath=${encodeURIComponent(currentDetailPath || '')}&season=${currentSeason}&episode=${episode}`;
    window.location.href = url;
  }));
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

document.addEventListener('DOMContentLoaded', initPlayer);
