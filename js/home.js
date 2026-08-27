var api = window.CineMind && window.CineMind.api;
var utils = window.CineMind && window.CineMind.utils;
var components = window.CineMind && window.CineMind.components;
var cfg = window.CineMind && window.CineMind.config;

async function initHome() {
  await cfg.loadConfig();

  const heroContainer = document.getElementById('hero-container');
  const sectionsContainer = document.getElementById('sections-container');
  if (!heroContainer || !sectionsContainer) return;

  heroContainer.innerHTML = components.skeletonHero();
  sectionsContainer.innerHTML = components.skeletonCard().repeat(6);

  try {
    const [homepageResult, hotResult, trendingResult] = await Promise.allSettled([
      api.getHomepage(),
      api.getHotMoviesSeries(),
      api.getTrending(0, 18)
    ]);

    const homepageData = homepageResult.status === 'fulfilled' ? (homepageResult.value?.data || {}) : {};
    const hotData = hotResult.status === 'fulfilled' ? (hotResult.value?.data || {}) : {};
    const trendingData = trendingResult.status === 'fulfilled' ? (trendingResult.value?.data || {}) : {};
    const mergedData = {
      ...homepageData,
      hotMoviesSeries: {
        movie: homepageData.hotMoviesSeries?.movie || hotData.movie || [],
        series: homepageData.hotMoviesSeries?.series || hotData.tv || hotData.series || []
      },
      trending: {
        subjectList: homepageData.trending?.subjectList || trendingData.subjectList || []
      }
    };

    if (!mergedData.hotMoviesSeries.movie.length && !mergedData.hotMoviesSeries.series.length && !mergedData.trending.subjectList.length && !mergedData.homeList?.length && !mergedData.topPickList?.length) {
      throw new Error('No movie data is available right now. Please try again later.');
    }
    renderHomepage(mergedData);
  } catch (err) {
    console.error('Homepage error:', err);
    heroContainer.innerHTML = components.errorState(err.message, initHome);
    sectionsContainer.innerHTML = '';
  }
}

function renderHomepage(data) {
  const heroContainer = document.getElementById('hero-container');
  const sectionsContainer = document.getElementById('sections-container');
  if (!heroContainer || !sectionsContainer) return;

  heroContainer.innerHTML = '';
  sectionsContainer.innerHTML = '';

  const banner = data.banner;
  const operatingList = data.operatingList || [];
  const hotMoviesSeries = data.hotMoviesSeries;
  const trending = data.trending;
  const topPickList = data.topPickList || [];
  const homeList = data.homeList || [];

  const bannerItems = (banner && banner.items && banner.items.length > 0)
    ? banner.items
    : (operatingList.length > 0 && operatingList[0].banner && operatingList[0].banner.items
      ? operatingList[0].banner.items
      : []);

  if (bannerItems.length > 0) {
    heroContainer.innerHTML = components.heroCarousel(bannerItems);
    initHeroCarousel();
  }

  if (hotMoviesSeries && hotMoviesSeries.movie && hotMoviesSeries.movie.length > 0) {
    sectionsContainer.innerHTML += components.carouselSection('Hot Movies', hotMoviesSeries.movie, { id: 'hot-movies' });
  }
  if (hotMoviesSeries && hotMoviesSeries.series && hotMoviesSeries.series.length > 0) {
    sectionsContainer.innerHTML += components.carouselSection('Hot Series', hotMoviesSeries.series, { id: 'hot-series' });
  }
  if (trending && trending.subjectList && trending.subjectList.length > 0) {
    sectionsContainer.innerHTML += components.carouselSection('Trending Now', trending.subjectList, { id: 'trending' });
  }

  operatingList.forEach((section, index) => {
    if (index === 0 && section.type === 'BANNER') return;
    const items = section.banner && section.banner.items && section.banner.items.length > 0
      ? section.banner.items
      : (section.subjects || []);
    if (items.length > 0) {
      const title = section.title || section.name || 'Featured';
      if (sectionsContainer.querySelector(`[data-section="${title}"]`)) return;
      sectionsContainer.innerHTML += components.carouselSection(title, items, { id: `section-${title.replace(/[\s]+/g, '-').toLowerCase()}` });
    }
  });

  homeList.forEach(section => {
    const items = section.subjects || section.items || section.data || [];
    if (items.length > 0) {
      const title = section.title || section.name || 'Featured';
      if (sectionsContainer.querySelector(`[data-section="${title}"]`)) return;
      sectionsContainer.innerHTML += components.carouselSection(title, items, { id: `section-${title.replace(/\s+/g, '-').toLowerCase()}` });
    }
  });

  topPickList.forEach(section => {
    const items = section.subjects || section.items || section.data || [];
    if (items.length > 0) {
      const title = section.title || section.name || 'Top Picks';
      if (sectionsContainer.querySelector(`[data-section="${title}"]`)) return;
      sectionsContainer.innerHTML += components.carouselSection(title, items, { id: `section-${title.replace(/\s+/g, '-').toLowerCase()}` });
    }
  });

  initCarousels();
}

function initHeroCarousel() {
  const slides = document.querySelectorAll('.cs-hero-slide');
  const dotsContainer = document.getElementById('hero-dots');
  if (slides.length === 0) return;

  let current = 0;
  let interval;

  function showSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    const dots = document.querySelectorAll('.cs-hero-dot');
    if (dotsContainer) {
      dots.forEach(d => d.classList.remove('active'));
      if (dots[index]) dots[index].classList.add('active');
    }
    if (slides[index]) slides[index].classList.add('active');
    current = index;
  }

  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `cs-hero-dot ${i === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => {
        showSlide(i);
        resetAutoPlay();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function nextSlide() {
    const next = (current + 1) % slides.length;
    showSlide(next);
  }

  function autoPlay() {
    interval = setInterval(nextSlide, 5000);
  }

  function resetAutoPlay() {
    clearInterval(interval);
    autoPlay();
  }

  autoPlay();
}

function initCarousels() {
  document.querySelectorAll('.cs-carousel').forEach(carousel => {
    const track = carousel.querySelector('.cs-carousel-track');
    if (!track) return;
    const prevBtn = carousel.parentElement.querySelector('.cs-carousel-prev');
    const nextBtn = carousel.parentElement.querySelector('.cs-carousel-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -track.clientWidth * 0.7, behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        track.scrollBy({ left: track.clientWidth * 0.7, behavior: 'smooth' });
      });
    }

    track.addEventListener('scroll', () => {
      if (prevBtn) prevBtn.style.opacity = track.scrollLeft <= 10 ? '0.5' : '1';
      if (nextBtn) nextBtn.style.opacity = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10 ? '0.5' : '1';
    });

    if (prevBtn) prevBtn.style.opacity = '0.5';
    if (nextBtn) nextBtn.style.opacity = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10 ? '0.5' : '1';
  });
}

document.addEventListener('DOMContentLoaded', initHome);
