
// NOTE: You do not need to edit this file.

// NASA's APOD API only has images from June 16, 1995 onwards
const earliestDate = '1995-06-16';

function formatDateInputValue(date) {
  return date.toISOString().split('T')[0];
}

function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getEarliestApodDate() {
  return new Date(`${earliestDate}T00:00:00`);
}

function clampDateToApodRange(date) {
  const earliest = getEarliestApodDate();
  const today = getTodayDate();

  if (date < earliest) {
    return earliest;
  }

  if (date > today) {
    return today;
  }

  return date;
}

function getDateDaysAgo(daysAgo) {
  const date = getTodayDate();
  date.setDate(date.getDate() - daysAgo);
  return clampDateToApodRange(date);
}

function getThisMonthRange() {
  const today = getTodayDate();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    startDate: clampDateToApodRange(start),
    endDate: today
  };
}

function getCurrentYearRange() {
  const today = getTodayDate();
  const start = new Date(today.getFullYear(), 0, 1);
  return {
    startDate: clampDateToApodRange(start),
    endDate: today
  };
}

function getPresetRange(presetKey) {
  if (presetKey === 'last7') {
    return {
      startDate: getDateDaysAgo(6),
      endDate: getTodayDate()
    };
  }

  if (presetKey === 'last30') {
    return {
      startDate: getDateDaysAgo(29),
      endDate: getTodayDate()
    };
  }

  if (presetKey === 'thisMonth') {
    return getThisMonthRange();
  }

  if (presetKey === 'bestOfYear') {
    return getCurrentYearRange();
  }

  return null;
}

function applyDateRange(startInput, endInput, range) {
  if (!range) {
    return;
  }

  startInput.value = formatDateInputValue(range.startDate);
  endInput.value = formatDateInputValue(range.endDate);
}

function syncDateInputOrder(startInput, endInput) {
  if (!startInput.value || !endInput.value) {
    return;
  }

  if (startInput.value > endInput.value) {
    endInput.value = startInput.value;
  }
}

function setupDateInputs(startInput, endInput) {
  const today = formatDateInputValue(getTodayDate());

  // Restrict date selection range from NASA's first image to today
  startInput.min = earliestDate;
  startInput.max = today;
  endInput.min = earliestDate;
  endInput.max = today;

  // Default: Show the most recent 7 days of space images.
  const defaultRange = getPresetRange('last7');
  applyDateRange(startInput, endInput, defaultRange);

  // Keep custom selections valid without forcing a fixed window size.
  startInput.addEventListener('change', () => {
    syncDateInputOrder(startInput, endInput);
  });

  endInput.addEventListener('change', () => {
    syncDateInputOrder(startInput, endInput);
  });
}

window.getPresetRange = getPresetRange;
window.applyDateRange = applyDateRange;
