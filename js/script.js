// Find our key page elements once so we can reuse them.
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('.filters button');
const presetButtons = document.querySelectorAll('.preset-button');
const rangeSummary = document.getElementById('rangeSummary');
const themeToggle = document.getElementById('themeToggle');
const siteFavicon = document.getElementById('siteFavicon');
const siteTouchIcon = document.getElementById('siteTouchIcon');

const featuredApod = document.getElementById('featuredApod');
const featuredMedia = document.getElementById('featuredMedia');
const featuredTitle = document.getElementById('featuredTitle');
const featuredDate = document.getElementById('featuredDate');
const featuredDescription = document.getElementById('featuredDescription');
const featuredOpenButton = document.getElementById('featuredOpenButton');
const featuredFavoriteButton = document.getElementById('featuredFavoriteButton');

const favoritesDrawerToggle = document.getElementById('favoritesDrawerToggle');
const favoritesDrawer = document.getElementById('favoritesDrawer');
const closeFavoritesDrawer = document.getElementById('closeFavoritesDrawer');
const favoritesDrawerBackdrop = document.getElementById('favoritesDrawerBackdrop');
const favoritesGallery = document.getElementById('favoritesGallery');
const favoritesCount = document.getElementById('favoritesCount');

const apodModal = document.getElementById('apodModal');
const closeModalButton = document.getElementById('closeModal');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

const spaceFactText = document.getElementById('spaceFactText');

// NASA API setup for classroom projects.
const nasaApiBaseUrl = 'https://api.nasa.gov/planetary/apod';
const apiKey = 'vBlHHrAPJbPNMzqsBpeudbn1iiz2hTiKydFGJV5e';
const defaultButtonText = 'Get Space Images';
const favoritesStorageKey = 'apodFavorites';
const themeStorageKey = 'themePreference';
const maxCustomRangeDays = 60;
const drawerAnimationMs = 220;
const signalLockDelayMs = 340;
const debugMode = false;

let currentGalleryItems = [];
let currentFeaturedItem = null;
let favoriteItems = [];
let lastFocusedElement = null;
let activePreset = 'last7';
let drawerCloseTimerId = null;
let drawerLastFocusedElement = null;

const presetLabels = {
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  thisMonth: 'This Month',
  bestOfYear: 'Best of Year'
};

const spaceFacts = [
  'The Sun holds about 99.8% of all the mass in our solar system.',
  'One day on Venus is longer than one year on Venus.',
  'Neutron stars can spin at more than 600 rotations per second.',
  'The footprints from Apollo missions can last for millions of years on the Moon.',
  'Saturn would float in water because it is less dense than water.',
  'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.'
];

setupDateInputs(startInput, endInput);

function debugLog(label, value) {
  if (!debugMode) {
    return;
  }

  console.log(`[DEBUG] ${label}:`, value);
}

function setLoadingState(isLoading) {
  getImagesButton.disabled = isLoading;
  getImagesButton.textContent = isLoading ? 'Loading...' : defaultButtonText;
}

function showGalleryMessage(message) {
  gallery.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon">🔭</div>
      <p>${message}</p>
    </div>
  `;
}

function updateRangeSummary(message, status = 'info') {
  const normalizedStatus = ['idle', 'info', 'loading', 'success', 'warning', 'error'].includes(status)
    ? status
    : 'info';

  const statusLabels = {
    idle: 'Standby',
    info: 'Status',
    loading: 'Scanning',
    success: 'Locked',
    warning: 'Check',
    error: 'Error'
  };

  rangeSummary.classList.remove(
    'status-idle',
    'status-info',
    'status-loading',
    'status-success',
    'status-warning',
    'status-error'
  );

  rangeSummary.classList.add(`status-${normalizedStatus}`);

  const chip = document.createElement('span');
  chip.className = 'status-chip';
  chip.textContent = statusLabels[normalizedStatus];

  const statusMessage = document.createElement('span');
  statusMessage.className = 'status-message';
  statusMessage.textContent = message;

  rangeSummary.replaceChildren(chip, statusMessage);
}

async function playMissionStatusMoment(message, delayMs = signalLockDelayMs) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  updateRangeSummary(message, 'success');

  if (prefersReducedMotion) {
    return;
  }

  rangeSummary.classList.remove('signal-lock');
  void rangeSummary.offsetWidth;
  rangeSummary.classList.add('signal-lock');

  await new Promise((resolve) => {
    window.setTimeout(() => {
      rangeSummary.classList.remove('signal-lock');
      resolve();
    }, delayMs);
  });
}

function setupSectionReveal() {
  const revealTargets = document.querySelectorAll(
    '.site-header, .preset-panel, .filters-kicker, .filters, .range-summary, .featured-apod, .space-fact, .gallery-kicker'
  );

  if (revealTargets.length === 0) {
    return;
  }

  revealTargets.forEach((element, index) => {
    element.classList.add('section-reveal');
    element.style.setProperty('--reveal-delay', `${Math.min(index, 8) * 35}ms`);
  });

  if (!('IntersectionObserver' in window)) {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    root: null,
    threshold: 0.16,
    rootMargin: '0px 0px -6% 0px'
  });

  revealTargets.forEach((element) => revealObserver.observe(element));
}

function setupGalleryReveal() {
  const galleryItems = gallery.querySelectorAll('.gallery-item.reveal-item');

  if (galleryItems.length === 0) {
    return;
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    galleryItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const galleryRevealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    root: null,
    threshold: 0.14,
    rootMargin: '0px 0px -8% 0px'
  });

  galleryItems.forEach((item) => galleryRevealObserver.observe(item));
}

function showRandomSpaceFact() {
  const randomIndex = Math.floor(Math.random() * spaceFacts.length);
  spaceFactText.textContent = spaceFacts[randomIndex];
}

function applyTransparentFavicon() {
  if (!siteFavicon) {
    return;
  }

  const sourceImage = new Image();

  sourceImage.onload = () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    canvas.width = sourceImage.naturalWidth;
    canvas.height = sourceImage.naturalHeight;
    context.drawImage(sourceImage, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = imageData;
    const width = canvas.width;
    const height = canvas.height;
    const totalPixels = width * height;
    const whiteThreshold = 245;

    // Flood-fill from the edges so we only remove the outside white background.
    const outsidePixels = new Uint8Array(totalPixels);
    const queue = [];
    let queueIndex = 0;

    const isNearWhite = (pixelIndex) => {
      const offset = pixelIndex * 4;
      return data[offset] >= whiteThreshold
        && data[offset + 1] >= whiteThreshold
        && data[offset + 2] >= whiteThreshold
        && data[offset + 3] > 0;
    };

    const pushPixel = (pixelIndex) => {
      if (pixelIndex < 0 || pixelIndex >= totalPixels) {
        return;
      }

      if (outsidePixels[pixelIndex] || !isNearWhite(pixelIndex)) {
        return;
      }

      outsidePixels[pixelIndex] = 1;
      queue.push(pixelIndex);
    };

    for (let x = 0; x < width; x += 1) {
      pushPixel(x);
      pushPixel((height - 1) * width + x);
    }

    for (let y = 0; y < height; y += 1) {
      pushPixel(y * width);
      pushPixel(y * width + width - 1);
    }

    while (queueIndex < queue.length) {
      const pixelIndex = queue[queueIndex];
      queueIndex += 1;

      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);

      if (x > 0) pushPixel(pixelIndex - 1);
      if (x < width - 1) pushPixel(pixelIndex + 1);
      if (y > 0) pushPixel(pixelIndex - width);
      if (y < height - 1) pushPixel(pixelIndex + width);
    }

    for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += 1) {
      if (outsidePixels[pixelIndex]) {
        data[pixelIndex * 4 + 3] = 0;
      }
    }

    context.putImageData(imageData, 0, 0);
    const transparentIcon = canvas.toDataURL('image/png');
    siteFavicon.href = transparentIcon;
    siteFavicon.type = 'image/png';

    if (siteTouchIcon) {
      siteTouchIcon.href = transparentIcon;
    }
  };

  sourceImage.src = siteFavicon.href;
}

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(themeStorageKey);

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);

  const isDark = theme === 'dark';
  const icon = isDark ? '\u2600' : '\u263E';
  const label = isDark ? 'Light mode' : 'Dark mode';

  themeToggle.innerHTML = `<span class="theme-toggle-icon" aria-hidden="true">${icon}</span><span class="theme-toggle-label">${label}</span>`;
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme') || 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
}

function formatDisplayDate(dateString) {
  const parsedDate = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateString;
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getInclusiveDayCount(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((end - start) / millisecondsPerDay) + 1;
}

function setActivePreset(nextPreset) {
  activePreset = nextPreset;

  presetButtons.forEach((button) => {
    const isActive = button.dataset.preset === nextPreset;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function getEmbedVideoUrl(url) {
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return url;
  }

  if (url.includes('/embed/')) {
    return url;
  }

  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  const queryString = url.split('?')[1] || '';
  const searchParams = new URLSearchParams(queryString);
  const videoId = searchParams.get('v');
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function isDirectVideoFile(url) {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url);
}

function getGalleryMediaImage(item) {
  if (item.media_type === 'video') {
    if (item.thumbnail_url) {
      return item.thumbnail_url;
    }

    const fallbackSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0b3d91"/>
            <stop offset="100%" stop-color="#0b0d12"/>
          </linearGradient>
        </defs>
        <rect width="800" height="450" fill="url(#bg)"/>
        <circle cx="400" cy="225" r="62" fill="rgba(255,255,255,0.18)"/>
        <polygon points="380,190 380,260 440,225" fill="#ffffff"/>
        <text x="400" y="330" text-anchor="middle" fill="#e8eef9" font-family="Arial, sans-serif" font-size="30">Video Preview</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackSvg)}`;
  }

  return item.url;
}

function createDescriptionPreview(text, maxLength = 220) {
  if (!text) {
    return 'No description available.';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...`;
}

function createFavoriteButtonText(isSaved) {
  return isSaved ? '♥ Saved' : '♡ Save';
}

function loadFavorites() {
  const storedFavorites = localStorage.getItem(favoritesStorageKey);

  if (!storedFavorites) {
    return [];
  }

  try {
    const parsedFavorites = JSON.parse(storedFavorites);

    if (!Array.isArray(parsedFavorites)) {
      return [];
    }

    return parsedFavorites.filter((item) => item && item.date && item.title && item.url);
  } catch (error) {
    console.warn('Could not parse favorites from localStorage:', error);
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteItems));
}

function isFavorited(date) {
  return favoriteItems.some((item) => item.date === date);
}

function getFavoriteByDate(date) {
  return favoriteItems.find((item) => item.date === date) || null;
}

function getLightweightFavoriteItem(item) {
  return {
    date: item.date,
    title: item.title,
    explanation: item.explanation,
    media_type: item.media_type,
    url: item.url,
    hdurl: item.hdurl,
    thumbnail_url: item.thumbnail_url
  };
}

function getSortedFavoriteItems() {
  return [...favoriteItems].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function syncFavoriteButtons() {
  const favoriteButtons = document.querySelectorAll('.favorite-button[data-date]');

  favoriteButtons.forEach((button) => {
    const isSaved = isFavorited(button.dataset.date);
    button.setAttribute('aria-pressed', String(isSaved));
    button.classList.toggle('is-favorite', isSaved);
    button.textContent = createFavoriteButtonText(isSaved);
  });
}

function triggerFavoritePop(date) {
  const matchingButtons = document.querySelectorAll(`.favorite-button[data-date="${date}"]`);

  matchingButtons.forEach((button) => {
    button.classList.remove('favorite-pop');
    void button.offsetWidth;
    button.classList.add('favorite-pop');
  });
}

function renderFavoritesDrawer() {
  if (favoriteItems.length === 0) {
    favoritesCount.textContent = '0 saved';
    favoritesGallery.innerHTML = '<p class="favorites-empty">No favorites yet. Save APODs while browsing, then view them here.</p>';
    return;
  }

  const sortedFavorites = getSortedFavoriteItems();
  favoritesCount.textContent = `♥ ${sortedFavorites.length} saved`;

  favoritesGallery.innerHTML = sortedFavorites
    .map((item) => {
      const imageUrl = getGalleryMediaImage(item);
      return `
        <article class="favorite-item" data-date="${item.date}">
          <img src="${imageUrl}" alt="${item.title}" />
          <p class="favorite-item-title">${item.title}</p>
          <p class="favorite-item-date">${formatDisplayDate(item.date)}</p>
          <p class="favorite-item-description">${createDescriptionPreview(item.explanation, 120)}</p>
          <div class="favorite-item-actions">
            <button class="favorite-open-button button-primary" type="button" data-date="${item.date}">Open</button>
            <button class="favorite-remove-button button-danger" type="button" data-date="${item.date}">Remove</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function openFavoritesDrawer() {
  drawerLastFocusedElement = document.activeElement;

  if (drawerCloseTimerId) {
    clearTimeout(drawerCloseTimerId);
    drawerCloseTimerId = null;
  }

  favoritesDrawer.classList.remove('hidden');
  favoritesDrawerBackdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    favoritesDrawer.classList.add('is-open');
    favoritesDrawerBackdrop.classList.add('is-open');
  });
  favoritesDrawer.setAttribute('aria-hidden', 'false');
  favoritesDrawerToggle.setAttribute('aria-expanded', 'true');

  setTimeout(() => {
    closeFavoritesDrawer.focus();
  }, 0);
}

function closeFavoritesDrawerPanel(shouldRestoreFocus = true) {
  const shouldReturnFocus = shouldRestoreFocus && favoritesDrawer.contains(document.activeElement);

  favoritesDrawer.classList.remove('is-open');
  favoritesDrawerBackdrop.classList.remove('is-open');
  favoritesDrawer.setAttribute('aria-hidden', 'true');
  favoritesDrawerToggle.setAttribute('aria-expanded', 'false');

  if (drawerCloseTimerId) {
    clearTimeout(drawerCloseTimerId);
  }

  drawerCloseTimerId = setTimeout(() => {
    favoritesDrawer.classList.add('hidden');
    favoritesDrawerBackdrop.classList.add('hidden');

    if (shouldReturnFocus) {
      favoritesDrawerToggle.focus();
    } else if (shouldRestoreFocus && drawerLastFocusedElement && typeof drawerLastFocusedElement.focus === 'function') {
      drawerLastFocusedElement.focus();
    }

    drawerCloseTimerId = null;
  }, drawerAnimationMs);
}

function showLoadingSkeletons() {
  featuredApod.classList.remove('hidden');
  featuredMedia.innerHTML = '<div class="skeleton-block skeleton-featured-media"></div>';
  featuredTitle.innerHTML = '<span class="skeleton-line skeleton-title"></span>';
  featuredDate.innerHTML = '<span class="skeleton-line skeleton-date"></span>';
  featuredDescription.innerHTML = `
    <span class="skeleton-line skeleton-text"></span>
    <span class="skeleton-line skeleton-text"></span>
    <span class="skeleton-line skeleton-text short"></span>
  `;

  featuredOpenButton.disabled = true;
  featuredFavoriteButton.disabled = true;
  delete featuredFavoriteButton.dataset.date;

  gallery.innerHTML = Array.from({ length: 3 }, (_, index) => `
    <article class="gallery-item skeleton-card" style="--stagger:${Math.min(index, 10) * 58}ms">
      <div class="skeleton-block skeleton-card-media"></div>
      <span class="skeleton-line skeleton-title"></span>
      <span class="skeleton-line skeleton-date"></span>
      <span class="skeleton-line skeleton-text"></span>
      <span class="skeleton-line skeleton-text short"></span>
    </article>
  `).join('');
}

function toggleFavorite(item) {
  if (!item?.date) {
    return;
  }

  const existingItem = getFavoriteByDate(item.date);

  if (existingItem) {
    favoriteItems = favoriteItems.filter((favoriteItem) => favoriteItem.date !== item.date);
  } else {
    favoriteItems.push(getLightweightFavoriteItem(item));
  }

  saveFavorites();
  renderFavoritesDrawer();
  syncFavoriteButtons();

  if (!existingItem) {
    triggerFavoritePop(item.date);
  }
}

function getCurrentItemByDate(date) {
  if (currentFeaturedItem?.date === date) {
    return currentFeaturedItem;
  }

  return currentGalleryItems.find((item) => item.date === date) || getFavoriteByDate(date);
}

function hideFeaturedApod() {
  currentFeaturedItem = null;
  featuredMedia.innerHTML = '';
  featuredTitle.textContent = '';
  featuredDate.textContent = '';
  featuredDescription.textContent = '';
  delete featuredFavoriteButton.dataset.date;
  featuredFavoriteButton.textContent = createFavoriteButtonText(false);
  featuredFavoriteButton.setAttribute('aria-pressed', 'false');
  featuredFavoriteButton.classList.remove('is-favorite');
  featuredOpenButton.disabled = false;
  featuredFavoriteButton.disabled = false;
  featuredApod.classList.add('hidden');
}

function renderFeaturedApod(item) {
  if (!item) {
    hideFeaturedApod();
    return;
  }

  currentFeaturedItem = item;
  const featuredImage = item.hdurl || item.url;

  featuredMedia.innerHTML = `
    <div class="featured-media-frame">
      <img src="${featuredImage}" alt="${item.title}" />
      <div class="media-caption featured-media-caption" aria-hidden="true">
        <p class="media-caption-title">${item.title}</p>
        <p class="media-caption-date">${formatDisplayDate(item.date)}</p>
      </div>
      <span class="featured-media-overlay" aria-hidden="true"></span>
    </div>
  `;
  featuredTitle.textContent = item.title;
  featuredDate.textContent = formatDisplayDate(item.date);
  featuredDescription.textContent = createDescriptionPreview(item.explanation);
  featuredFavoriteButton.dataset.date = item.date;
  featuredOpenButton.disabled = false;
  featuredFavoriteButton.disabled = false;
  featuredApod.classList.remove('hidden');
  syncFavoriteButtons();
}

function splitFeaturedAndGalleryItems(items) {
  const featuredIndex = items.findIndex((item) => item.media_type === 'image');

  if (featuredIndex === -1) {
    return {
      featuredItem: null,
      galleryItems: items
    };
  }

  return {
    featuredItem: items[featuredIndex],
    galleryItems: items.filter((_, index) => index !== featuredIndex)
  };
}

function createGalleryMarkup(apodItems) {
  return apodItems
    .map((item, index) => {
      const cardImage = getGalleryMediaImage(item);
      const mediaLabel = item.media_type === 'video' ? ' (Video)' : '';
      const isSaved = isFavorited(item.date);
      const excerpt = item.explanation
        ? `${item.explanation.slice(0, 140)}${item.explanation.length > 140 ? '...' : ''}`
        : 'No description available.';
      const videoLinkMarkup = item.media_type === 'video'
        ? `<a class="gallery-video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Watch video</a>`
        : '';

      return `
        <article class="gallery-item reveal-item" data-index="${index}" data-media-type="${item.media_type}" role="button" tabindex="0" style="--stagger:${Math.min(index, 10) * 58}ms">
          <div class="gallery-media-frame">
            <img src="${cardImage}" alt="${item.title}" />
            <div class="media-caption gallery-media-caption" aria-hidden="true">
              <p class="gallery-media-tag">${item.media_type === 'video' ? 'Video Transmission' : 'Image Transmission'}</p>
              <p class="media-caption-title">${item.title}${mediaLabel}</p>
              <p class="media-caption-date">${formatDisplayDate(item.date)}</p>
            </div>
            <span class="gallery-media-overlay" aria-hidden="true"></span>
          </div>
          <p class="gallery-excerpt">${excerpt}</p>
          <div class="gallery-actions">
            <button class="favorite-button button-secondary${isSaved ? ' is-favorite' : ''}" type="button" data-date="${item.date}" aria-pressed="${isSaved}">${createFavoriteButtonText(isSaved)}</button>
            ${videoLinkMarkup}
          </div>
        </article>
      `;
    })
    .join('');
}

function openModal(item) {
  if (!favoritesDrawer.classList.contains('hidden')) {
    closeFavoritesDrawerPanel(false);
  }

  lastFocusedElement = document.activeElement;

  let mediaMarkup = `<img src="${item.hdurl || item.url}" alt="${item.title}" />`;

  if (item.media_type === 'video') {
    if (isDirectVideoFile(item.url)) {
      mediaMarkup = `
        <video controls preload="metadata">
          <source src="${item.url}" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <p><a class="modal-video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open video in a new tab</a></p>
      `;
    } else {
      mediaMarkup = `
        <iframe src="${getEmbedVideoUrl(item.url)}" title="${item.title}" loading="lazy" allowfullscreen></iframe>
        <p><a class="modal-video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Open video in a new tab</a></p>
      `;
    }
  }

  modalMedia.innerHTML = mediaMarkup;
  modalTitle.textContent = item.title;
  modalDate.textContent = formatDisplayDate(item.date);
  modalExplanation.textContent = item.explanation || 'No description available.';
  apodModal.classList.remove('hidden');
  apodModal.setAttribute('aria-hidden', 'false');
  closeModalButton.focus();
}

function closeModal() {
  if (apodModal.contains(document.activeElement)) {
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    } else {
      getImagesButton.focus();
    }
  }

  apodModal.classList.add('hidden');
  apodModal.setAttribute('aria-hidden', 'true');
  modalMedia.innerHTML = '';
}

function prepareApodData(apodData) {
  const items = Array.isArray(apodData) ? apodData : [apodData];

  return items
    .filter((item) => (item.media_type === 'image' || item.media_type === 'video') && item.url && item.title && item.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function buildBestOfYearItems(items) {
  const imageItems = items.filter((item) => item.media_type === 'image');
  const highlightedByMonth = new Map();

  for (const item of imageItems) {
    const monthKey = item.date.slice(0, 7);

    if (!highlightedByMonth.has(monthKey)) {
      highlightedByMonth.set(monthKey, item);
    }
  }

  const monthlyHighlights = Array.from(highlightedByMonth.values())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 12);

  if (monthlyHighlights.length >= 12) {
    return monthlyHighlights;
  }

  const usedDates = new Set(monthlyHighlights.map((item) => item.date));

  for (const item of imageItems) {
    if (usedDates.has(item.date)) {
      continue;
    }

    monthlyHighlights.push(item);
    usedDates.add(item.date);

    if (monthlyHighlights.length === 12) {
      break;
    }
  }

  return monthlyHighlights;
}

async function applyPreset(presetKey, shouldFetch = true) {
  const range = getPresetRange(presetKey);

  if (!range) {
    return;
  }

  applyDateRange(startInput, endInput, range);
  setActivePreset(presetKey);

  if (shouldFetch) {
    await handleGetImagesClick();
  }
}

async function handleGetImagesClick() {
  debugLog('1) Button click handler fired', true);

  const startDate = startInput.value;
  const endDate = endInput.value;

  if (!startDate || !endDate) {
    showGalleryMessage('Please choose a start date and end date first.');
    updateRangeSummary('Please select both dates to load APOD results.', 'warning');
    return;
  }

  const selectedDayCount = getInclusiveDayCount(startDate, endDate);

  if (selectedDayCount > maxCustomRangeDays && activePreset !== 'bestOfYear') {
    showGalleryMessage(`Please choose a smaller range (up to ${maxCustomRangeDays} days) for faster loading.`);
    updateRangeSummary(`Selected range is ${selectedDayCount} days. Try ${maxCustomRangeDays} days or fewer.`, 'warning');
    return;
  }

  setLoadingState(true);
  showLoadingSkeletons();
  updateRangeSummary(`Loading ${presetLabels[activePreset] || 'selected'} range...`, 'loading');

  const requestStartedAt = performance.now();
  const requestUrl = `${nasaApiBaseUrl}?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;

  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      const apiError = await response.json().catch(() => null);
      const error = new Error(apiError?.error?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const apodData = await response.json();
    let preparedItems = prepareApodData(apodData);

    if (activePreset === 'bestOfYear') {
      preparedItems = buildBestOfYearItems(preparedItems);
    }

    if (preparedItems.length === 0) {
      currentGalleryItems = [];
      hideFeaturedApod();
      showGalleryMessage('No APOD results were found for this date range.');
      updateRangeSummary('No APOD items found for this range. Try a different preset or different dates.', 'warning');
      return;
    }

    const { featuredItem, galleryItems } = splitFeaturedAndGalleryItems(preparedItems);
    renderFeaturedApod(featuredItem);
    currentGalleryItems = galleryItems;

    if (galleryItems.length === 0) {
      showGalleryMessage('The featured APOD is shown above. Try a wider date range to see more cards.');
      updateRangeSummary(`Showing 1 featured item for ${presetLabels[activePreset] || 'Selected range'}.`, 'success');
      syncFavoriteButtons();
      return;
    }

    const fetchElapsedMs = performance.now() - requestStartedAt;
    const missionDelayMs = fetchElapsedMs > 1200 ? 180 : signalLockDelayMs;

    await playMissionStatusMoment(`Signal lock acquired. Preparing ${galleryItems.length} transmissions...`, missionDelayMs);

    gallery.innerHTML = createGalleryMarkup(galleryItems);
    setupGalleryReveal();
    syncFavoriteButtons();

    const rangeLabel = presetLabels[activePreset] || 'Selected range';
    updateRangeSummary(`Transmission received: ${preparedItems.length} items for ${rangeLabel}, ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}.`, 'success');
  } catch (error) {
    console.error('NASA APOD fetch error:', error);
    currentGalleryItems = [];
    hideFeaturedApod();

    if (error.status === 429) {
      showGalleryMessage('NASA API rate limit reached for your API key. Please wait a bit and try again.');
      updateRangeSummary('Too many requests right now. Please wait and try again.', 'warning');
    } else if (error.status >= 500) {
      showGalleryMessage('NASA APOD service is temporarily unavailable (server error). Please try again soon.');
      updateRangeSummary('NASA APOD is temporarily unavailable.', 'error');
    } else {
      showGalleryMessage('Sorry, we could not load NASA images right now. Please try again.');
      updateRangeSummary('Could not load APOD data for this range.', 'error');
    }
  } finally {
    setLoadingState(false);
  }
}

getImagesButton.addEventListener('click', handleGetImagesClick);

presetButtons.forEach((button) => {
  button.addEventListener('click', () => {
    applyPreset(button.dataset.preset);
  });
});

startInput.addEventListener('change', () => {
  if (activePreset) {
    setActivePreset('');
  }

  updateRangeSummary('Manual date range selected. Click "Get Space Images" when ready.', 'info');
});

endInput.addEventListener('change', () => {
  if (activePreset) {
    setActivePreset('');
  }

  updateRangeSummary('Manual date range selected. Click "Get Space Images" when ready.', 'info');
});

featuredOpenButton.addEventListener('click', () => {
  if (!currentFeaturedItem) {
    return;
  }

  openModal(currentFeaturedItem);
});

featuredFavoriteButton.addEventListener('click', () => {
  if (!currentFeaturedItem) {
    return;
  }

  toggleFavorite(currentFeaturedItem);
});

favoritesDrawerToggle.addEventListener('click', () => {
  openFavoritesDrawer();
});

closeFavoritesDrawer.addEventListener('click', closeFavoritesDrawerPanel);
favoritesDrawerBackdrop.addEventListener('click', closeFavoritesDrawerPanel);

favoritesGallery.addEventListener('click', (event) => {
  const openButton = event.target.closest('.favorite-open-button');

  if (openButton) {
    const selectedItem = getFavoriteByDate(openButton.dataset.date);

    if (selectedItem) {
      openModal(selectedItem);
    }

    return;
  }

  const removeButton = event.target.closest('.favorite-remove-button');

  if (removeButton) {
    const selectedItem = getFavoriteByDate(removeButton.dataset.date);

    if (selectedItem) {
      toggleFavorite(selectedItem);
    }
  }
});

gallery.addEventListener('click', (event) => {
  if (event.target.closest('.gallery-video-link')) {
    return;
  }

  const favoriteButton = event.target.closest('.favorite-button[data-date]');

  if (favoriteButton) {
    event.stopPropagation();
    const selectedItem = getCurrentItemByDate(favoriteButton.dataset.date);

    if (selectedItem) {
      toggleFavorite(selectedItem);
    }

    return;
  }

  const card = event.target.closest('.gallery-item');

  if (!card) {
    return;
  }

  const selectedItem = currentGalleryItems[Number(card.dataset.index)];

  if (!selectedItem) {
    return;
  }

  openModal(selectedItem);
});

gallery.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  const card = event.target.closest('.gallery-item');

  if (!card) {
    return;
  }

  event.preventDefault();
  const selectedItem = currentGalleryItems[Number(card.dataset.index)];

  if (!selectedItem) {
    return;
  }

  openModal(selectedItem);
});

closeModalButton.addEventListener('click', closeModal);

apodModal.addEventListener('click', (event) => {
  if (event.target === apodModal) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!apodModal.classList.contains('hidden')) {
      closeModal();
    }

    if (!favoritesDrawer.classList.contains('hidden')) {
      closeFavoritesDrawerPanel();
    }
  }
});

themeToggle.addEventListener('click', toggleTheme);

applyTheme(getPreferredTheme());
applyTransparentFavicon();
showRandomSpaceFact();
favoriteItems = loadFavorites();
renderFavoritesDrawer();
setActivePreset('last7');
updateRangeSummary('Start with a preset, or pick dates manually below.', 'idle');
setupSectionReveal();
applyPreset('last7', false);
