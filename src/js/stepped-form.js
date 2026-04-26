/**
 * Stepped Quote Form
 * Manages a multi-step form with package-based validation, boat rental pricing,
 * and time-window-based catering options.
 *
 * Steps: 1. Vaart (date, package, departure/arrival, boat price)
 *        2. Catering (guests, catering options)
 *        3. Gegevens (personal details, price calculator)
 */

(function () {
  'use strict';

  // --- Sticky detection for price calculator ---
  let stickyObserver = null;
  let stickySentinel = null;

  function observeSticky(calculator) {
    // Clean up previous observer
    if (stickyObserver) stickyObserver.disconnect();
    if (stickySentinel) stickySentinel.remove();

    // Don't observe when static (last step)
    if (calculator.classList.contains('is-static')) {
      calculator.classList.remove('is-stuck');
      return;
    }

    // Insert a sentinel element right before the calculator
    stickySentinel = document.createElement('div');
    stickySentinel.style.height = '1px';
    stickySentinel.style.marginBottom = '-1px';
    calculator.parentNode.insertBefore(stickySentinel, calculator);

    stickyObserver = new IntersectionObserver(
      ([entry]) => {
        // When sentinel scrolls out of view at the bottom, calculator is stuck
        calculator.classList.toggle('is-stuck', !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    stickyObserver.observe(stickySentinel);
  }

  // Load pricing data from global variable (injected by 11ty)
  const pricingData = window.PRICING_DATA || {};

  const BOAT_RENTAL = pricingData.boatRental || {};
  const CHILDREN = pricingData.children || { ageLimit: 12, discount: 0.5 };
  const DRINKS = pricingData.drinks || {};
  const LUNCH = pricingData.lunch || {};
  const BORREL = pricingData.borrel || {};
  const DINNER = pricingData.dinner || {};
  const PACKAGE_CONFIG = pricingData.packages || {};

  // Form state
  const state = {
    currentStep: 1,
    totalSteps: 3,
    userOverrodeTimes: false,
    formData: {
      package: null,
      date: null,
      adults: null,
      children: 0,
      departure: null,
      arrival: null,
      catering: {
        drinks: 'advanceBilling',
        lunch: 'none',
        borrel: 'none',
        dinner: 'none',
      },
      personalDetails: {},
    },
  };

  // DOM elements
  let form, stepItems, stepContainers, btnBack, btnNext, btnSubmit, reassurance;

  /**
   * Initialize the stepped form
   */
  function init() {
    form = document.querySelector('.stepped-form');
    if (!form) return;

    stepItems = form.querySelectorAll('.step-item');
    stepContainers = form.querySelectorAll('.form-step');
    btnBack = form.querySelector('.btn-back');
    btnNext = form.querySelector('.btn-next');
    btnSubmit = form.querySelector('.btn-submit');
    reassurance = form.querySelector('.form-reassurance');

    setDateMinToToday();
    loadState();
    // If no package was restored from saved state, sync from pre-checked radio
    if (!state.formData.package) {
      const checkedPackage = form.querySelector('input[name="package"]:checked');
      if (checkedPackage) {
        state.formData.package = checkedPackage.value;
        updateDateConstraints();
        updateGuestsConstraints();
        updatePackageDefaults();
      }
    }
    setupEventListeners();
    renderStep();
    updatePriceCalculator();

    // Start observing sticky state for price calculator
    const calculator = form.querySelector('.price-calculator');
    if (calculator) observeSticky(calculator);
  }

  /**
   * Prevent picking a date in the past.
   */
  function setDateMinToToday() {
    const dateInput = form.querySelector('#date');
    if (!dateInput) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    btnBack.addEventListener('click', goToPreviousStep);
    btnNext.addEventListener('click', goToNextStep);

    stepItems.forEach((item, index) => {
      item.addEventListener('click', () => {
        if (item.classList.contains('is-clickable')) {
          goToStep(index + 1);
        }
      });
    });

    // Package selection
    const packageRadios = form.querySelectorAll('input[name="package"]');
    packageRadios.forEach(radio => {
      radio.addEventListener('change', handlePackageChange);
    });

    // Date input
    const dateInput = form.querySelector('#date');
    if (dateInput) dateInput.addEventListener('change', handleDateChange);

    // Time inputs (step 1)
    const departureInput = form.querySelector('#departure');
    const arrivalInput = form.querySelector('#arrival');
    if (departureInput) departureInput.addEventListener('change', handleDepartureChange);
    if (arrivalInput) arrivalInput.addEventListener('change', handleArrivalChange);

    // Guest inputs (step 2)
    const adultsInput = form.querySelector('#adults');
    const childrenInput = form.querySelector('#children');
    if (adultsInput) {
      adultsInput.addEventListener('input', handleGuestsChange);
      adultsInput.addEventListener('blur', validateGuestsOnBlur);
    }
    if (childrenInput) {
      childrenInput.addEventListener('input', handleGuestsChange);
      childrenInput.addEventListener('blur', validateGuestsOnBlur);
    }

    // Catering radios
    ['drinks', 'lunch', 'borrel', 'dinner'].forEach(category => {
      const radios = form.querySelectorAll(`input[name="${category}"]`);
      radios.forEach(radio => {
        radio.addEventListener('change', handleCateringChange);
      });
    });

    // Personal details inputs
    const nameInput = form.querySelector('#name');
    const emailInput = form.querySelector('#email');
    if (nameInput) nameInput.addEventListener('input', handlePersonalDetailsChange);
    if (emailInput) emailInput.addEventListener('input', handlePersonalDetailsChange);

    // Form submission
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('input', saveState);
  }

  // --- Event Handlers ---

  function handlePackageChange(e) {
    state.formData.package = e.target.value;
    // A new package picks new defaults; treat as a fresh start so its defaults apply.
    state.userOverrodeTimes = false;
    validateDateAgainstPackage();
    updateDateConstraints();
    updateGuestsConstraints();
    updatePackageDefaults();
    updatePriceCalculator();
    updateNavigationState();
    saveState();
  }

  function handleDateChange(e) {
    state.formData.date = e.target.value;
    validateDateAgainstPackage();
    updateNavigationState();
    saveState();
  }

  /**
   * Validate date against selected package's season constraints.
   * Warns and clears date if it falls outside the season range.
   */
  function validateDateAgainstPackage() {
    if (!state.formData.date || !state.formData.package) return;

    const config = PACKAGE_CONFIG[state.formData.package];
    if (!config || !config.dateRange) return;

    const selectedDate = new Date(state.formData.date);
    const startDate = new Date(config.dateRange.start);
    const endDate = new Date(config.dateRange.end);

    if (selectedDate < startDate || selectedDate > endDate) {
      showError(
        'De gekozen datum valt buiten het seizoen voor dit arrangement (april - oktober). Kies een andere datum.'
      );
      const dateInput = form.querySelector('#date');
      if (dateInput) dateInput.value = '';
      state.formData.date = null;
    }
  }

  function handleGuestsChange() {
    const adultsInput = form.querySelector('#adults');
    const childrenInput = form.querySelector('#children');
    state.formData.adults = parseInt(adultsInput?.value) || null;
    state.formData.children = parseInt(childrenInput?.value) || 0;

    // Clear per-field errors while typing
    if (adultsInput) hideFieldError(adultsInput);
    if (childrenInput) hideFieldError(childrenInput);

    // Update shared guest status
    updateGuestsStatus();

    updateGuestsConstraints();
    updatePriceCalculator();
    updatePriceCalculator();
    updateNavigationState();
    saveState();
  }

  function updateGuestsStatus() {
    const statusEl = form.querySelector('#guests-status');
    if (!statusEl) return;

    const adultsInput = form.querySelector('#adults');
    const childrenInput = form.querySelector('#children');
    const adults = parseInt(adultsInput?.value) || 0;
    const children = parseInt(childrenInput?.value) || 0;
    const total = adults + children;
    const config = PACKAGE_CONFIG[state.formData.package];

    // No input yet — show default help
    if (!adultsInput?.value && !childrenInput?.value) {
      statusEl.textContent = 'Totaal max. 40 personen';
      statusEl.classList.remove('is-error');
      if (adultsInput) adultsInput.classList.remove('is-invalid');
      if (childrenInput) childrenInput.classList.remove('is-invalid');
      return;
    }

    // Check total constraint
    if (total > 40) {
      statusEl.textContent = 'Totaal ' + total + ' personen — maximaal 40';
      statusEl.classList.add('is-error');
      if (adultsInput) adultsInput.classList.add('is-invalid');
      if (childrenInput && children > 0) childrenInput.classList.add('is-invalid');
      return;
    }

    // Check package-specific range
    if (config && total > 0) {
      if (total < config.minGuests) {
        statusEl.textContent =
          'Minimaal ' + config.minGuests + ' gasten voor dit arrangement (nu ' + total + ')';
        statusEl.classList.add('is-error');
        if (adultsInput) adultsInput.classList.add('is-invalid');
        return;
      }
      if (total > config.maxGuests) {
        statusEl.textContent =
          'Maximaal ' + config.maxGuests + ' gasten voor dit arrangement (nu ' + total + ')';
        statusEl.classList.add('is-error');
        if (adultsInput) adultsInput.classList.add('is-invalid');
        if (childrenInput && children > 0) childrenInput.classList.add('is-invalid');
        return;
      }
    }

    // Valid — show current total
    if (total > 0) {
      statusEl.textContent = total + ' van max. 40 personen';
    } else {
      statusEl.textContent = 'Totaal max. 40 personen';
    }
    statusEl.classList.remove('is-error');
    if (adultsInput) adultsInput.classList.remove('is-invalid');
    if (childrenInput) childrenInput.classList.remove('is-invalid');
  }

  function validateGuestsOnBlur(e) {
    const adultsInput = form.querySelector('#adults');
    const childrenInput = form.querySelector('#children');

    // Clamp adults to 1–40 on blur
    if (e.target === adultsInput) {
      if (adultsInput.value.trim() === '') {
        showFieldError(adultsInput, 'Vul het aantal volwassenen in');
        updateGuestsStatus();
        return;
      }
      const val = parseInt(adultsInput.value);
      const clamped = Math.min(40, Math.max(1, val));
      if (val !== clamped) {
        adultsInput.value = clamped;
        state.formData.adults = clamped;
      }
    }

    // Clamp children to 0–max on blur, auto-fill empty to 0
    if (e.target === childrenInput) {
      if (childrenInput.value.trim() === '') {
        childrenInput.value = '0';
      }
      const adults = parseInt(adultsInput?.value) || 0;
      const maxChildren = Math.max(0, 40 - adults);
      const val = parseInt(childrenInput.value);
      const clamped = Math.min(maxChildren, Math.max(0, val));
      if (val !== clamped) {
        childrenInput.value = clamped;
      }
      state.formData.children = clamped;
    }

    updateGuestsConstraints();
    updatePriceCalculator();
    updateNavigationState();
    updateGuestsStatus();
    saveState();
  }

  function showFieldError(input, message) {
    hideFieldError(input);
    const error = document.createElement('p');
    error.className = 'field-error';
    error.textContent = message;
    input.classList.add('is-invalid');
    input.parentNode.appendChild(error);
  }

  function hideFieldError(input) {
    input.classList.remove('is-invalid');
    const existing = input.parentNode.querySelector('.field-error');
    if (existing) existing.remove();
  }

  /**
   * Get total pax and effective pax (adults + discounted children)
   */
  function getTotalPax() {
    return (state.formData.adults || 0) + (state.formData.children || 0);
  }

  function getEffectivePax() {
    const adults = state.formData.adults || 0;
    const children = state.formData.children || 0;
    return adults + children * (1 - CHILDREN.discount);
  }

  function handleDepartureChange(e) {
    state.formData.departure = e.target.value || null;
    state.userOverrodeTimes = true;
    updatePriceCalculator();
    updateNavigationState();
    saveState();
  }

  function handleArrivalChange(e) {
    state.formData.arrival = e.target.value || null;
    state.userOverrodeTimes = true;
    updatePriceCalculator();
    updateNavigationState();
    saveState();
  }

  /**
   * Derive duration in hours from departure and arrival times
   */
  function getDuration() {
    if (!state.formData.departure || !state.formData.arrival) return null;
    const depMinutes = parseTime(state.formData.departure);
    const arrMinutes = parseTime(state.formData.arrival);
    const diff = arrMinutes - depMinutes;
    if (diff <= 0) return null;
    return diff / 60;
  }

  function handleCateringChange(e) {
    const category = e.target.name;
    state.formData.catering[category] = e.target.value;
    updatePriceCalculator();
    updatePriceCalculator();
    saveState();
  }

  function handlePersonalDetailsChange() {
    const nameInput = form.querySelector('#name');
    const emailInput = form.querySelector('#email');
    state.formData.personalDetails = {
      name: nameInput ? nameInput.value : '',
      email: emailInput ? emailInput.value : '',
    };
    updateNavigationState();
    saveState();
  }

  // --- Time Window Helpers ---

  /**
   * Parse "HH:MM" to minutes since midnight
   */
  function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  /**
   * Convert minutes since midnight to "HH:MM" string
   */
  function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  /**
   * Get the trip start/end in minutes since midnight
   */
  function getTripWindow() {
    if (!state.formData.departure || !state.formData.arrival) return null;
    const start = parseTime(state.formData.departure);
    const end = parseTime(state.formData.arrival);
    if (end <= start) return null;
    return { start, end };
  }

  /**
   * Check if trip window overlaps with a time window
   */
  function overlaps(trip, window) {
    const wStart = parseTime(window.start);
    const wEnd = parseTime(window.end);
    return trip.start < wEnd && trip.end > wStart;
  }

  // --- Boat Rental Price ---

  function calculateBoatRental() {
    const duration = getDuration();
    if (!duration || duration < 2) return null;
    let price = BOAT_RENTAL.base;
    if (duration > BOAT_RENTAL.tresholdHours) {
      price += (duration - BOAT_RENTAL.tresholdHours) * BOAT_RENTAL.perHour;
    }
    return price;
  }

  // --- Catering Logic ---

  /**
   * Calculate the catering price for a single category
   */
  function calculateCateringPrice(category, selection) {
    if (selection === 'none') return 0;
    const pax = getEffectivePax();
    const duration = getDuration() || 0;

    switch (category) {
      case 'drinks':
        // ppph pricing
        if (selection === 'dutchBar') return DRINKS.dutchBarPpPh * pax * duration;
        if (selection === 'winePackage') return DRINKS.winePackagePpPh * pax * duration;
        if (selection === 'advanceBilling') return DRINKS.advanceBillingPpPh * pax * duration;
        return 0;
      case 'lunch':
        return LUNCH.pp * pax;
      case 'borrel':
        if (selection === 'dutch') return BORREL.dutchPp * pax;
        if (selection === 'luxury') return BORREL.luxuryPp * pax;
        return 0;
      case 'dinner':
        if (selection === 'walking') return DINNER.walkingPp * pax;
        if (selection === 'shared') return DINNER.sharedPp * pax;
        return 0;
      default:
        return 0;
    }
  }

  function calculateTotalCatering() {
    let total = 0;
    for (const [category, selection] of Object.entries(state.formData.catering)) {
      total += calculateCateringPrice(category, selection);
    }
    return total;
  }

  /**
   * Update catering section visibility and defaults based on trip time window.
   * - defaultWindow overlap → show and select cheapest option
   * - offerWindow overlap (not default) → show but select "none"
   * - no overlap → hide entire fieldset
   */
  function updateCateringVisibility() {
    const trip = getTripWindow();

    const categories = [
      {
        id: 'drinks',
        config: {
          defaultWindow: { start: '00:00', end: '24:00' }, // drinks always available if trip exists
          offerWindow: { start: '00:00', end: '24:00' },
        },
        cheapest: 'advanceBilling',
      },
      {
        id: 'lunch',
        config: LUNCH,
        cheapest: 'standard',
      },
      {
        id: 'borrel',
        config: BORREL,
        cheapest: 'dutch',
      },
      {
        id: 'dinner',
        config: DINNER,
        cheapest: 'walking',
      },
    ];

    categories.forEach(({ id, config, cheapest }) => {
      const fieldset = form.querySelector(`#catering-${id}`);
      if (!fieldset) return;

      if (!trip) {
        // No trip window yet, show all disabled
        fieldset.style.display = '';
        fieldset.classList.remove('catering-hidden');
        return;
      }

      const inDefault = config.defaultWindow && overlaps(trip, config.defaultWindow);
      const inOffer = config.offerWindow && overlaps(trip, config.offerWindow);

      if (!inOffer) {
        // Hide entirely
        fieldset.style.display = 'none';
        fieldset.classList.add('catering-hidden');
        // Reset to none
        const noneRadio = fieldset.querySelector('input[value="none"]');
        if (noneRadio) {
          noneRadio.checked = true;
          state.formData.catering[id] = 'none';
        }
      } else {
        fieldset.style.display = '';
        fieldset.classList.remove('catering-hidden');

        if (inDefault) {
          // Auto-select cheapest option
          const cheapestRadio = fieldset.querySelector(`input[value="${cheapest}"]`);
          if (cheapestRadio && state.formData.catering[id] === 'none') {
            cheapestRadio.checked = true;
            state.formData.catering[id] = cheapest;
          }
        } else {
          // In offer window but not default → available, but off by default
          // Only reset if user hasn't explicitly chosen something
          // (we leave the current selection alone)
        }
      }
    });

    updatePriceCalculator();
  }

  // --- Unified Price Calculator (visible on all steps) ---

  function formatEuro(value) {
    return '€' + value.toLocaleString('nl-NL');
  }

  function updatePriceCalculator() {
    const boatPriceEl = form.querySelector('#boat-price');
    const cateringPriceEl = form.querySelector('#catering-price');
    const totalPriceEl = form.querySelector('#total-price');

    if (!boatPriceEl) return;

    const boatPrice = calculateBoatRental();
    boatPriceEl.textContent = boatPrice === null ? '—' : formatEuro(boatPrice);

    // Catering needs guests and a duration to be meaningful.
    const totalPax = getTotalPax();
    const duration = getDuration();
    let cateringTotal = null;
    if (totalPax && duration) {
      cateringTotal = calculateTotalCatering();
    }
    if (cateringPriceEl) {
      cateringPriceEl.textContent = cateringTotal === null ? '—' : formatEuro(cateringTotal);
    }

    if (totalPriceEl) {
      if (boatPrice === null && cateringTotal === null) {
        totalPriceEl.textContent = '—';
      } else {
        const total = (boatPrice || 0) + (cateringTotal || 0);
        totalPriceEl.textContent = formatEuro(total);
      }
    }
  }

  // --- Package Constraints ---

  function updateDateConstraints() {
    const dateInput = form.querySelector('#date');
    if (!dateInput || !state.formData.package) return;

    const config = PACKAGE_CONFIG[state.formData.package];
    const today = new Date().toISOString().split('T')[0];

    if (config.dateRange) {
      dateInput.min = config.dateRange.start > today ? config.dateRange.start : today;
      dateInput.max = config.dateRange.end;
    } else {
      dateInput.min = today;
      dateInput.removeAttribute('max');
    }
  }

  function updateGuestsConstraints() {
    const adultsInput = form.querySelector('#adults');
    const childrenInput = form.querySelector('#children');
    if (!adultsInput) return;

    if (state.formData.package) {
      const config = PACKAGE_CONFIG[state.formData.package];
      adultsInput.min = config.minGuests;
    }

    // Cap children max so total doesn't exceed 40
    const adults = state.formData.adults || 0;
    const maxChildren = Math.max(0, 40 - adults);
    if (childrenInput) childrenInput.max = maxChildren;

    // Cap adults max
    const children = state.formData.children || 0;
    adultsInput.max = 40 - children;
  }

  function updatePackageDefaults() {
    if (!state.formData.package) return;

    const config = PACKAGE_CONFIG[state.formData.package];
    const departureInput = form.querySelector('#departure');
    const arrivalInput = form.querySelector('#arrival');

    if (departureInput && config.defaultDeparture) {
      departureInput.value = config.defaultDeparture;
      state.formData.departure = config.defaultDeparture;
    } else if (departureInput && !config.defaultDeparture) {
      departureInput.value = '';
      state.formData.departure = null;
    }

    if (arrivalInput && config.defaultDeparture && config.defaultDuration) {
      const depMinutes = parseTime(config.defaultDeparture);
      const arrMinutes = depMinutes + config.defaultDuration * 60;
      const arrivalTime = minutesToTime(arrMinutes);
      // Select the matching option if it exists
      const option = arrivalInput.querySelector(`option[value="${arrivalTime}"]`);
      if (option) {
        arrivalInput.value = arrivalTime;
        state.formData.arrival = arrivalTime;
      } else {
        arrivalInput.value = '';
        state.formData.arrival = null;
      }
    } else if (arrivalInput && (!config.defaultDeparture || !config.defaultDuration)) {
      arrivalInput.value = '';
      state.formData.arrival = null;
    }

    updatePriceCalculator();
  }

  // --- Navigation ---

  function updateNavigationState() {
    if (!btnNext) return;
    btnNext.disabled = !validateCurrentStepSilent();
  }

  function validateCurrentStepSilent() {
    switch (state.currentStep) {
      case 1: {
        if (!state.formData.package || !state.formData.date) return false;
        if (!state.formData.departure || !state.formData.arrival) return false;

        const duration = getDuration();
        if (!duration || duration < 2 || duration > 12) return false;

        const config = PACKAGE_CONFIG[state.formData.package];
        if (config.dateRange) {
          const selectedDate = new Date(state.formData.date);
          const startDate = new Date(config.dateRange.start);
          const endDate = new Date(config.dateRange.end);
          if (selectedDate < startDate || selectedDate > endDate) return false;
        }

        return true;
      }

      case 2: {
        const totalPax = getTotalPax();
        if (!state.formData.adults) return false;
        if (totalPax > 40) return false;

        const config = PACKAGE_CONFIG[state.formData.package];
        if (totalPax < config.minGuests || totalPax > config.maxGuests) return false;

        return true;
      }

      case 3: {
        const nameInput = form.querySelector('#name');
        const emailInput = form.querySelector('#email');
        if (!nameInput || !emailInput) return false;
        if (!nameInput.value.trim()) return false;
        if (!emailInput.value.trim() || !isValidEmail(emailInput.value)) return false;
        return true;
      }

      default:
        return false;
    }
  }

  function validateCurrentStep() {
    switch (state.currentStep) {
      case 1: {
        if (!state.formData.date) {
          showError('Kies een gewenste datum');
          return false;
        }
        if (!state.formData.package) {
          showError('Selecteer een arrangement');
          return false;
        }
        if (!state.formData.departure || !state.formData.arrival) {
          showError('Kies een vertrek- en eindtijd');
          return false;
        }
        const duration = getDuration();
        if (!duration || duration < 2) {
          showError('Eindtijd moet minstens 2 uur na vertrektijd zijn');
          return false;
        }
        if (duration > 12) {
          showError('Vaartijd mag maximaal 12 uur zijn');
          return false;
        }

        const config = PACKAGE_CONFIG[state.formData.package];
        if (config.dateRange) {
          const selectedDate = new Date(state.formData.date);
          const startDate = new Date(config.dateRange.start);
          const endDate = new Date(config.dateRange.end);
          if (selectedDate < startDate || selectedDate > endDate) {
            showError('Kies een datum binnen het seizoen (april - oktober)');
            return false;
          }
        }
        return true;
      }

      case 2: {
        const totalPax = getTotalPax();
        if (!state.formData.adults) {
          showError('Vul het aantal volwassenen in');
          return false;
        }

        if (totalPax > 40) {
          showError('Totaal aantal personen mag niet meer dan 40 zijn');
          return false;
        }

        const config = PACKAGE_CONFIG[state.formData.package];
        if (totalPax < config.minGuests || totalPax > config.maxGuests) {
          showError(
            `Totaal aantal personen moet tussen ${config.minGuests} en ${config.maxGuests} zijn`
          );
          return false;
        }
        return true;
      }

      case 3: {
        const nameInput = form.querySelector('#name');
        const emailInput = form.querySelector('#email');
        if (!nameInput || !emailInput) return false;
        if (!nameInput.value.trim()) {
          showError('Vul je naam in');
          return false;
        }
        if (!emailInput.value.trim() || !isValidEmail(emailInput.value)) {
          showError('Vul een geldig e-mailadres in');
          return false;
        }
        return true;
      }

      default:
        return false;
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(message) {
    let errorEl = form.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      form.insertBefore(errorEl, form.querySelector('.form-navigation'));
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }

  function hideError() {
    const errorEl = form.querySelector('.form-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  function goToNextStep() {
    if (!validateCurrentStep()) return;
    hideError();

    if (state.currentStep < state.totalSteps) {
      state.currentStep++;

      // When entering catering step, update visibility based on trip window
      if (state.currentStep === 2) {
        updateCateringVisibility();
      }

      renderStep();
      saveState();
    }
  }

  function goToPreviousStep() {
    hideError();
    if (state.currentStep > 1) {
      state.currentStep--;
      renderStep();
      saveState();
    }
  }

  function goToStep(targetStep) {
    if (targetStep > state.currentStep) return;
    hideError();
    state.currentStep = targetStep;
    renderStep();
    saveState();
  }

  function renderStep() {
    stepItems.forEach((item, index) => {
      const stepNumber = index + 1;
      item.classList.remove('is-active', 'is-completed', 'is-clickable');

      if (stepNumber < state.currentStep) {
        item.classList.add('is-completed', 'is-clickable');
      } else if (stepNumber === state.currentStep) {
        item.classList.add('is-active');
      }
    });

    stepContainers.forEach((container, index) => {
      const stepNumber = index + 1;
      if (stepNumber === state.currentStep) {
        container.style.display = 'block';
        container.setAttribute('aria-hidden', 'false');
      } else {
        container.style.display = 'none';
        container.setAttribute('aria-hidden', 'true');
      }
    });

    btnBack.style.display = state.currentStep === 1 ? 'none' : 'inline-block';

    if (state.currentStep === state.totalSteps) {
      btnNext.style.display = 'none';
      btnSubmit.style.display = 'inline-block';
      if (reassurance) reassurance.style.display = 'block';
      updatePriceCalculator();
    } else {
      btnNext.style.display = 'inline-block';
      btnSubmit.style.display = 'none';
      if (reassurance) reassurance.style.display = 'none';
    }

    const conditionalSections = document.querySelectorAll('[data-show-on-step]');
    conditionalSections.forEach(section => {
      const showOnStep = parseInt(section.getAttribute('data-show-on-step'));
      section.style.display = showOnStep === state.currentStep ? 'block' : 'none';
    });

    // Price calculator: sticky on input-driven steps, static on the final step
    // where the user has already finished pricing decisions.
    const calculator = form.querySelector('.price-calculator');
    if (calculator) {
      calculator.classList.toggle('is-static', state.currentStep === state.totalSteps);
      // Re-evaluate stuck state after step change
      observeSticky(calculator);
    }

    updateNavigationState();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // --- State Persistence ---

  function saveState() {
    try {
      sessionStorage.setItem('quoteFormState', JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save form state:', e);
    }
  }

  function loadState() {
    try {
      const saved = sessionStorage.getItem('quoteFormState');
      if (saved) {
        const savedState = JSON.parse(saved);
        Object.assign(state, savedState);

        // Ensure totalSteps matches current form structure
        state.totalSteps = 3;
        if (state.currentStep > state.totalSteps) {
          state.currentStep = state.totalSteps;
        }

        // Migrate from old state format: guests → adults
        if (state.formData.guests && !state.formData.adults) {
          state.formData.adults = state.formData.guests;
          delete state.formData.guests;
        }

        // Migrate from old state format: duration → arrival
        if (state.formData.duration && state.formData.departure && !state.formData.arrival) {
          const depMinutes = parseTime(state.formData.departure);
          const arrMinutes = depMinutes + state.formData.duration * 60;
          state.formData.arrival = minutesToTime(arrMinutes);
          delete state.formData.duration;
        }

        // Restore form values
        if (state.formData.package) {
          const packageRadio = form.querySelector(
            `input[name="package"][value="${state.formData.package}"]`
          );
          if (packageRadio) packageRadio.checked = true;
          updateDateConstraints();
          updateGuestsConstraints();
        }

        if (state.formData.date) {
          const dateInput = form.querySelector('#date');
          if (dateInput) dateInput.value = state.formData.date;
        }

        if (state.formData.adults) {
          const adultsInput = form.querySelector('#adults');
          if (adultsInput) adultsInput.value = state.formData.adults;
        }

        if (state.formData.children) {
          const childrenInput = form.querySelector('#children');
          if (childrenInput) childrenInput.value = state.formData.children;
        }

        if (state.formData.departure) {
          const departureInput = form.querySelector('#departure');
          if (departureInput) departureInput.value = state.formData.departure;
        }

        if (state.formData.arrival) {
          const arrivalInput = form.querySelector('#arrival');
          if (arrivalInput) arrivalInput.value = state.formData.arrival;
        }

        // Restore catering selections
        if (state.formData.catering) {
          for (const [category, selection] of Object.entries(state.formData.catering)) {
            const radio = form.querySelector(`input[name="${category}"][value="${selection}"]`);
            if (radio) radio.checked = true;
          }
        } else {
          // Migrate from old state format
          state.formData.catering = {
            drinks: 'advanceBilling',
            lunch: 'none',
            borrel: 'none',
            dinner: 'none',
          };
        }

        // Restore personal details
        if (state.formData.personalDetails.name) {
          const nameInput = form.querySelector('#name');
          if (nameInput) nameInput.value = state.formData.personalDetails.name;
        }

        if (state.formData.personalDetails.email) {
          const emailInput = form.querySelector('#email');
          if (emailInput) emailInput.value = state.formData.personalDetails.email;
        }

        updatePriceCalculator();
        updatePriceCalculator();
      }
    } catch (e) {
      console.warn('Could not load form state:', e);
    }
  }

  function handleSubmit(e) {
    if (!validateCurrentStep()) {
      e.preventDefault();
      return false;
    }

    try {
      sessionStorage.removeItem('quoteFormState');
    } catch (e) {
      console.warn('Could not clear form state:', e);
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
