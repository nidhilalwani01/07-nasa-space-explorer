// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('.filters button');
const apodModal = document.getElementById('apodModal');
const closeModalButton = document.getElementById('closeModal');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const spaceFactText = document.getElementById('spaceFactText');

// NASA API endpoint and demo key for classroom projects
const nasaApiBaseUrl = 'https://api.nasa.gov/planetary/apod';
const apiKey = 'vBlHHrAPJbPNMzqsBpeudbn1iiz2hTiKydFGJV5e';
const defaultButtonText = 'Get Space Images';
let currentGalleryItems = [];
const debugMode = false;
let lastFocusedElement = null;

// Simple facts shown above the gallery.
const spaceFacts = [
	'The Sun holds about 99.8% of all the mass in our solar system.',
	'One day on Venus is longer than one year on Venus.',
	'Neutron stars can spin at more than 600 rotations per second.',
	'The footprints from Apollo missions can last for millions of years on the Moon.',
	'Saturn would float in water because it is less dense than water.',
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.'
];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Reuse the existing placeholder style for loading, empty, and error messages.
function showGalleryMessage(message) {
	gallery.innerHTML = `
		<div class="placeholder">
			<div class="placeholder-icon">🔭</div>
			<p>${message}</p>
		</div>
	`;
}

// Toggle a clear loading state on the existing button.
function setLoadingState(isLoading) {
	getImagesButton.disabled = isLoading;
	getImagesButton.textContent = isLoading ? 'Loading...' : defaultButtonText;
}

function debugLog(label, value) {
	if (!debugMode) {
		return;
	}

	console.log(`[DEBUG] ${label}:`, value);
}

function showRandomSpaceFact() {
	const randomIndex = Math.floor(Math.random() * spaceFacts.length);
	spaceFactText.textContent = spaceFacts[randomIndex];
}

// Convert common YouTube URLs to embed format so videos open reliably in the modal.
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

// Keep gallery cards visually consistent by always rendering an image thumbnail.
function getGalleryMediaImage(item) {
	if (item.media_type === 'video') {
		if (item.thumbnail_url) {
			return item.thumbnail_url;
		}

		// Local SVG fallback so video cards still have a clean preview if no thumbnail is provided.
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

// Build the card markup using existing .gallery-item styles.
function createGalleryMarkup(apodItems) {
	return apodItems
		.map((item, index) => {
			const cardImage = getGalleryMediaImage(item);
			const mediaLabel = item.media_type === 'video' ? ' (Video)' : '';
			const excerpt = item.explanation
				? `${item.explanation.slice(0, 140)}${item.explanation.length > 140 ? '...' : ''}`
				: 'No description available.';
			const videoLinkMarkup = item.media_type === 'video'
				? `<a class="gallery-video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">Watch video</a>`
				: '';

			return `
				<article class="gallery-item" data-index="${index}" role="button" tabindex="0">
					<img src="${cardImage}" alt="${item.title}" />
					<p class="gallery-title">${item.title}${mediaLabel}</p>
					<p class="gallery-date">${formatDisplayDate(item.date)}</p>
					${videoLinkMarkup}
					<p class="gallery-excerpt">${excerpt}</p>
				</article>
			`;
		})
		.join('');
}

function openModal(item) {
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
	// Move focus out of modal before hiding it to avoid aria-hidden focus warnings.
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

// Sort by newest date first for easier browsing.
function prepareApodData(apodData) {
	const items = Array.isArray(apodData) ? apodData : [apodData];

	return items
		.filter((item) => (item.media_type === 'image' || item.media_type === 'video') && item.url && item.title && item.date)
		.sort((a, b) => (a.date < b.date ? 1 : -1));
}

async function handleGetImagesClick() {
	debugLog('1) Button click handler fired', true);

	const startDate = startInput.value;
	const endDate = endInput.value;
	debugLog('2) Selected dates', { startDate, endDate });

	if (!startDate || !endDate) {
		showGalleryMessage('Please choose a start date and end date first.');
		debugLog('2) Selected dates validation failed', 'Missing start or end date');
		return;
	}

	setLoadingState(true);
	showGalleryMessage('Loading NASA space images...');

	const requestUrl = `${nasaApiBaseUrl}?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}&thumbs=true`;
	debugLog('3) Request URL', requestUrl);

	try {
		const response = await fetch(requestUrl);
		debugLog('4) Response status', response.status);
		debugLog('4) Response ok', response.ok);

		if (!response.ok) {
			const apiError = await response.json().catch(() => null);
			const error = new Error(apiError?.error?.message || `Request failed with status ${response.status}`);
			error.status = response.status;
			throw error;
		}

		const apodData = await response.json();
		debugLog('4) Raw APOD response', apodData);
		const preparedItems = prepareApodData(apodData);
		debugLog('5) Prepared item count', preparedItems.length);

		if (preparedItems.length === 0) {
			currentGalleryItems = [];
			showGalleryMessage('No APOD results were found for this date range.');
			debugLog('5) Gallery update', 'No items rendered (empty result)');
			return;
		}

		currentGalleryItems = preparedItems;
		gallery.innerHTML = createGalleryMarkup(preparedItems);
		debugLog('5) Gallery items rendered in DOM', gallery.querySelectorAll('.gallery-item').length);
	} catch (error) {
		console.error('NASA APOD fetch error:', error);
		debugLog('4) Request failed', error.message);
		currentGalleryItems = [];

		if (error.status === 429) {
			showGalleryMessage('NASA API rate limit reached for your API key. Please wait a bit and try again.');
		} else if (error.status >= 500) {
			showGalleryMessage('NASA APOD service is temporarily unavailable (server error). Please try again soon.');
		} else {
			showGalleryMessage('Sorry, we could not load NASA images right now. Please try again.');
		}
	} finally {
		setLoadingState(false);
	}
}

getImagesButton.addEventListener('click', handleGetImagesClick);

gallery.addEventListener('click', (event) => {
	if (event.target.closest('.gallery-video-link')) {
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
	if (event.key === 'Escape' && !apodModal.classList.contains('hidden')) {
		closeModal();
	}
});

showRandomSpaceFact();
