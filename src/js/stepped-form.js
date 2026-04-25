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
  let form, progressBar, progressBoat, progressSteps, stepContainers, btnBack, btnNext, btnSubmit;

  /**
   * Initialize the stepped form
   */
  function init() {
    form = document.querySelector('.stepped-form');
    if (!form) return;

    progressBar = form.querySelector('.progress-fill');
    progressBoat = form.querySelector('.progress-boat');
    progressSteps = form.querySelectorAll('.progress-step');
    stepContainers = form.querySelectorAll('.form-step');
    btnBack = form.querySelector('.btn-back');
    btnNext = form.querySelector('.btn-next');
    btnSubmit = form.querySelector('.btn-submit');

    loadState();
    setupEventListeners();
    renderStep();
    updateBoatPriceEstimate();
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    btnBack.addEventListener('click', goToPreviousStep);
    btnNext.addEventListener('click', goToNextStep);

    progressSteps.forEach((step, index) => {
      step.addEventListener('click', () => {
        const targetStep = index + 1;
        goToStep(targetStep);
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
    if (adultsInput) adultsInput.addEventListener('input', handleGuestsChange);
    if (childrenInput) childrenInput.addEventListener('input', handleGuestsChange);

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
    validateDateAgainstPackage();
    updateDateConstraints();
    updateGuestsConstraints();
    if (!state.userOverrodeTimes) {
      updatePackageDefaults();
    }
    updateBoatPriceEstimate();
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

    // Enforce max 40 total
    const total = (state.formData.adults || 0) + state.formData.children;
    if (total > 40 && childrenInput) {
      state.formData.children = 40 - (state.formData.adults || 0);
      if (state.formData.children < 0) state.formData.children = 0;
      childrenInput.value = state.formData.children;
    }

    updateGuestsConstraints();
    updateCateringTotal();
    updatePriceCalculator();
    updateNavigationState();
    saveState();
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
    updateBoatPriceEstimate();
    updateNavigationState();
    saveState();
  }

  function handleArrivalChange(e) {
    state.formData.arrival = e.target.value || null;
    state.userOverrodeTimes = true;
    updateBoatPriceEstimate();
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
    updateCateringTotal();
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

  function updateBoatPriceEstimate() {
    const estimateEl = form.querySelector('#price-estimate');
    if (!estimateEl) return;

    const price = calculateBoatRental();
    if (price === null) {
      estimateEl.textContent = '—';
      return;
    }
    estimateEl.textContent = '€' + price.toLocaleString('nl-NL');
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

    updateCateringTotal();
  }

  function updateCateringTotal() {
    const totalEl = form.querySelector('#catering-total');
    if (!totalEl) return;

    const totalPax = getTotalPax();
    const duration = getDuration();

    if (!totalPax || !duration) {
      totalEl.textContent = '—';
      return;
    }

    const total = calculateTotalCatering();
    totalEl.textContent = '€' + total.toLocaleString('nl-NL');
  }

  // --- Price Calculator (Step 4) ---

  function updatePriceCalculator() {
    const boatPriceEl = form.querySelector('#boat-price');
    const cateringPriceEl = form.querySelector('#catering-price');
    const cateringLineEl = form.querySelector('#catering-line');
    const totalPriceEl = form.querySelector('#total-price');
    const exvatPriceEl = form.querySelector('#exvat-price');

    if (!boatPriceEl) return;

    const boatPrice = calculateBoatRental();
    if (boatPrice === null) {
      boatPriceEl.textContent = '—';
      if (totalPriceEl) totalPriceEl.textContent = '—';
      if (exvatPriceEl) exvatPriceEl.textContent = '—';
      if (cateringLineEl) cateringLineEl.style.display = 'none';
      return;
    }

    boatPriceEl.textContent = '€' + boatPrice.toLocaleString('nl-NL');

    const cateringTotal = calculateTotalCatering();
    if (cateringTotal > 0) {
      cateringPriceEl.textContent = '€' + cateringTotal.toLocaleString('nl-NL');
      cateringLineEl.style.display = 'flex';
    } else {
      if (cateringLineEl) cateringLineEl.style.display = 'none';
    }

    const total = boatPrice + cateringTotal;
    totalPriceEl.textContent = '€' + total.toLocaleString('nl-NL');

    const exVat = total / 1.21;
    exvatPriceEl.textContent = '€' + Math.round(exVat).toLocaleString('nl-NL');
  }

  // --- Package Constraints ---

  function updateDateConstraints() {
    const dateInput = form.querySelector('#date');
    if (!dateInput || !state.formData.package) return;

    const config = PACKAGE_CONFIG[state.formData.package];
    if (config.dateRange) {
      dateInput.min = config.dateRange.start;
      dateInput.max = config.dateRange.end;
    } else {
      dateInput.removeAttribute('min');
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

    updateBoatPriceEstimate();
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
          showError('Kies een vertrek- en aankomsttijd');
          return false;
        }
        const duration = getDuration();
        if (!duration || duration < 2) {
          showError('Aankomsttijd moet minstens 2 uur na vertrektijd zijn');
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
    const progressPercent = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
    if (progressBar) progressBar.style.width = progressPercent + '%';

    if (progressBoat) {
      progressBoat.style.left = progressPercent + '%';
      progressBoat.classList.remove('wobble');
      void progressBoat.offsetWidth;
      progressBoat.classList.add('wobble');
      setTimeout(() => progressBoat.classList.remove('wobble'), 600);
    }

    progressSteps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove('active', 'completed', 'clickable');

      if (stepNumber < state.currentStep) {
        step.classList.add('completed', 'clickable');
        step.style.cursor = 'pointer';
      } else if (stepNumber === state.currentStep) {
        step.classList.add('active', 'clickable');
        step.style.cursor = 'pointer';
      } else {
        step.style.cursor = 'default';
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
      updatePriceCalculator();
    } else {
      btnNext.style.display = 'inline-block';
      btnSubmit.style.display = 'none';
    }

    const conditionalSections = document.querySelectorAll('[data-show-on-step]');
    conditionalSections.forEach(section => {
      const showOnStep = parseInt(section.getAttribute('data-show-on-step'));
      section.style.display = showOnStep === state.currentStep ? 'block' : 'none';
    });

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

        updateBoatPriceEstimate();
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
