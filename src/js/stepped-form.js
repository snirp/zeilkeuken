/**
 * Stepped Quote Form
 * Manages a multi-step form with package-based validation and dynamic content
 */

(function() {
  'use strict';

  // Package configuration - defines rules for each package
  const PACKAGE_CONFIG = {
    dagvaart: {
      name: 'Dagvaart',
      price: 115,
      minGuests: 25,
      maxGuests: 40,
      dateRange: { start: '2026-04-01', end: '2026-10-31' },
      availableExtras: ['luxury-upgrade', 'dj', 'fotograaf', 'oesters', 'accordeon'],
      upgradePrice: 25,
      upgradeText: '(+€25 pp)',
      upgradeDescription: 'Premium wijnen, craft bieren, exclusieve kazen en extra gang'
    },
    dinervaart: {
      name: 'Dinervaart',
      price: 110,
      minGuests: 25,
      maxGuests: 40,
      dateRange: { start: '2026-04-01', end: '2026-10-31' },
      availableExtras: ['luxury-upgrade', 'dj', 'fotograaf', 'oesters'],
      upgradePrice: 30,
      upgradeText: '(+€30 pp)',
      upgradeDescription: 'Premium wijnarrangement, amuse & pre-dessert, specialty cocktails'
    },
    maatwerk: {
      name: 'Maatwerk',
      price: null,
      minGuests: 15,
      maxGuests: 40,
      dateRange: null,
      availableExtras: ['dj', 'fotograaf', 'oesters', 'accordeon'],
      upgradePrice: null
    }
  };

  // Fixed-price extras
  const FIXED_EXTRAS = {
    dj: 350,
    fotograaf: 450,
    accordeon: 300
  };

  // Per-person extras
  const PER_PERSON_EXTRAS = {
    oesters: 15
  };

  // Form state
  const state = {
    currentStep: 1,
    totalSteps: 4,
    formData: {
      package: null,
      date: null,
      guests: null,
      extras: [],
      personalDetails: {}
    }
  };

  // DOM elements
  let form, progressBar, progressBoat, progressSteps, stepContainers, btnBack, btnNext, btnSubmit;

  /**
   * Initialize the stepped form
   */
  function init() {
    // Get DOM elements
    form = document.querySelector('.stepped-form');
    if (!form) return;

    progressBar = form.querySelector('.progress-fill');
    progressBoat = form.querySelector('.progress-boat');
    progressSteps = form.querySelectorAll('.progress-step');
    stepContainers = form.querySelectorAll('.form-step');
    btnBack = form.querySelector('.btn-back');
    btnNext = form.querySelector('.btn-next');
    btnSubmit = form.querySelector('.btn-submit');

    // Load saved state from sessionStorage
    loadState();

    // Set up event listeners
    setupEventListeners();

    // Render initial state
    renderStep();
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Navigation buttons
    btnBack.addEventListener('click', goToPreviousStep);
    btnNext.addEventListener('click', goToNextStep);

    // Progress step navigation
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

    // Date and guests inputs
    const dateInput = form.querySelector('#date');
    const guestsInput = form.querySelector('#guests');
    
    if (dateInput) {
      dateInput.addEventListener('change', handleDateChange);
    }
    
    if (guestsInput) {
      guestsInput.addEventListener('input', handleGuestsChange);
    }

    // Extras checkboxes
    const extrasCheckboxes = form.querySelectorAll('.extras-step input[type="checkbox"]');
    extrasCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', handleExtrasChange);
    });

    // Personal details inputs
    const nameInput = form.querySelector('#name');
    const emailInput = form.querySelector('#email');
    
    if (nameInput) nameInput.addEventListener('input', handlePersonalDetailsChange);
    if (emailInput) emailInput.addEventListener('input', handlePersonalDetailsChange);

    // Form submission
    form.addEventListener('submit', handleSubmit);

    // Auto-save state on input
    form.addEventListener('input', saveState);
  }

  /**
   * Handle package selection
   */
  function handlePackageChange(e) {
    state.formData.package = e.target.value;
    updateDateConstraints();
    updateGuestsConstraints();
    updateAvailableExtras();
    updatePriceCalculator();
    updateNavigationState();
    saveState();
  }

  /**
   * Handle date change
   */
  function handleDateChange(e) {
    state.formData.date = e.target.value;
    updatePriceCalculator();
    updateNavigationState();
    saveState();
  }

  /**
   * Handle guests change
   */
  function handleGuestsChange(e) {
    state.formData.guests = parseInt(e.target.value) || null;
    updatePriceCalculator();
    updateNavigationState();
    saveState();
  }

  /**
   * Handle extras checkbox change
   */
  function handleExtrasChange() {
    const checkedExtras = Array.from(
      form.querySelectorAll('.extras-step input[type="checkbox"]:checked')
    ).map(cb => cb.name);
    
    state.formData.extras = checkedExtras;
    updatePriceCalculator();
    saveState();
  }

  /**
   * Handle personal details change
   */
  function handlePersonalDetailsChange() {
    const nameInput = form.querySelector('#name');
    const emailInput = form.querySelector('#email');
    
    state.formData.personalDetails = {
      name: nameInput ? nameInput.value : '',
      email: emailInput ? emailInput.value : ''
    };
    updateNavigationState();
    saveState();
  }

  /**
   * Update date input constraints based on selected package
   */
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

  /**
   * Update guests input constraints based on selected package
   */
  function updateGuestsConstraints() {
    const guestsInput = form.querySelector('#guests');
    if (!guestsInput || !state.formData.package) return;

    const config = PACKAGE_CONFIG[state.formData.package];
    guestsInput.min = config.minGuests;
    guestsInput.max = config.maxGuests;
    guestsInput.placeholder = `${config.minGuests}-${config.maxGuests}`;
  }

  /**
   * Update available extras based on selected package
   */
  function updateAvailableExtras() {
    if (!state.formData.package) return;

    const config = PACKAGE_CONFIG[state.formData.package];
    const allExtrasContainers = form.querySelectorAll('.extra-option');

    allExtrasContainers.forEach(container => {
      const checkbox = container.querySelector('input[type="checkbox"]');
      if (!checkbox) return;

      const extraName = checkbox.name;
      const isAvailable = config.availableExtras.includes(extraName);

      if (isAvailable) {
        container.style.display = '';
        checkbox.disabled = false;
      } else {
        container.style.display = 'none';
        checkbox.disabled = true;
        checkbox.checked = false;
      }
    });

    // Update luxury upgrade text if available
    if (config.availableExtras.includes('luxury-upgrade')) {
      const upgradeLabel = form.querySelector('#upgrade-label');
      const upgradeDescription = form.querySelector('#upgrade-description');
      
      if (upgradeLabel && config.upgradeText) {
        upgradeLabel.innerHTML = `Luxe upgrade <strong>${config.upgradeText}</strong>`;
      }
      if (upgradeDescription && config.upgradeDescription) {
        upgradeDescription.textContent = config.upgradeDescription;
      }
    }
  }

  /**
   * Update price calculator
   */
  function updatePriceCalculator() {
    const basePriceEl = form.querySelector('#base-price');
    const extrasPriceEl = form.querySelector('#extras-price');
    const extrasLineEl = form.querySelector('#extras-line');
    const totalPriceEl = form.querySelector('#total-price');
    const exvatPriceEl = form.querySelector('#exvat-price');

    if (!basePriceEl || !state.formData.package || !state.formData.guests) {
      if (basePriceEl) basePriceEl.textContent = '—';
      if (totalPriceEl) totalPriceEl.textContent = '—';
      if (exvatPriceEl) exvatPriceEl.textContent = '—';
      if (extrasLineEl) extrasLineEl.style.display = 'none';
      return;
    }

    const config = PACKAGE_CONFIG[state.formData.package];
    
    // If maatwerk or no price, show custom pricing
    if (!config.price) {
      basePriceEl.textContent = 'Op maat';
      totalPriceEl.textContent = 'Op maat';
      exvatPriceEl.textContent = 'Op maat';
      if (extrasLineEl) extrasLineEl.style.display = 'none';
      return;
    }

    // Calculate base price
    let basePrice = config.price * state.formData.guests;

    // Add luxury upgrade if checked
    const luxuryCheckbox = form.querySelector('input[name="luxury-upgrade"]');
    if (luxuryCheckbox && luxuryCheckbox.checked && config.upgradePrice) {
      basePrice += config.upgradePrice * state.formData.guests;
    }

    // Calculate extras
    let extrasTotal = 0;
    state.formData.extras.forEach(extraName => {
      if (FIXED_EXTRAS[extraName]) {
        extrasTotal += FIXED_EXTRAS[extraName];
      } else if (PER_PERSON_EXTRAS[extraName]) {
        extrasTotal += PER_PERSON_EXTRAS[extraName] * state.formData.guests;
      }
    });

    // Update display
    basePriceEl.textContent = '€' + basePrice.toLocaleString('nl-NL');

    if (extrasTotal > 0) {
      extrasPriceEl.textContent = '€' + extrasTotal.toLocaleString('nl-NL');
      extrasLineEl.style.display = 'flex';
    } else {
      if (extrasLineEl) extrasLineEl.style.display = 'none';
    }

    const total = basePrice + extrasTotal;
    totalPriceEl.textContent = '€' + total.toLocaleString('nl-NL');

    const exVat = total / 1.21;
    exvatPriceEl.textContent = '€' + Math.round(exVat).toLocaleString('nl-NL');
  }

  /**
   * Update navigation button states
   */
  function updateNavigationState() {
    if (!btnNext) return;
    
    const isValid = validateCurrentStepSilent();
    btnNext.disabled = !isValid;
  }

  /**
   * Validate current step silently (no error messages)
   */
  function validateCurrentStepSilent() {
    switch (state.currentStep) {
      case 1: // Package selection
        return state.formData.package !== null;
      
      case 2: // Date and guests
        if (!state.formData.date || !state.formData.guests) return false;
        
        const config = PACKAGE_CONFIG[state.formData.package];
        if (config.dateRange) {
          const selectedDate = new Date(state.formData.date);
          const startDate = new Date(config.dateRange.start);
          const endDate = new Date(config.dateRange.end);
          
          if (selectedDate < startDate || selectedDate > endDate) return false;
        }
        
        if (state.formData.guests < config.minGuests || state.formData.guests > config.maxGuests) {
          return false;
        }
        
        return true;
      
      case 3: // Extras (optional, always valid)
        return true;
      
      case 4: // Personal details
        const nameInput = form.querySelector('#name');
        const emailInput = form.querySelector('#email');
        
        if (!nameInput || !emailInput) return false;
        if (!nameInput.value.trim()) return false;
        if (!emailInput.value.trim() || !isValidEmail(emailInput.value)) return false;
        
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Validate current step
   */
  function validateCurrentStep() {
    switch (state.currentStep) {
      case 1: // Package selection
        return state.formData.package !== null;
      
      case 2: // Date and guests
        if (!state.formData.date || !state.formData.guests) return false;
        
        // Validate date range if applicable
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
        
        // Validate guest count
        if (state.formData.guests < config.minGuests || state.formData.guests > config.maxGuests) {
          showError(`Aantal personen moet tussen ${config.minGuests} en ${config.maxGuests} zijn`);
          return false;
        }
        
        return true;
      
      case 3: // Extras (optional, always valid)
        return true;
      
      case 4: // Personal details
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
      
      default:
        return false;
    }
  }

  /**
   * Validate email format
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Show error message
   */
  function showError(message) {
    // Create or update error message element
    let errorEl = form.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      form.insertBefore(errorEl, form.querySelector('.form-navigation'));
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }

  /**
   * Hide error message
   */
  function hideError() {
    const errorEl = form.querySelector('.form-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
  }

  /**
   * Go to next step
   */
  function goToNextStep() {
    if (!validateCurrentStep()) return;
    
    hideError();
    
    if (state.currentStep < state.totalSteps) {
      state.currentStep++;
      renderStep();
      saveState();
    }
  }

  /**
   * Go to previous step
   */
  function goToPreviousStep() {
    hideError();
    
    if (state.currentStep > 1) {
      state.currentStep--;
      renderStep();
      saveState();
    }
  }

  /**
   * Go to specific step
   */
  function goToStep(targetStep) {
    // Only allow going to current step or completed steps
    if (targetStep > state.currentStep) {
      return; // Cannot jump forward
    }
    
    hideError();
    state.currentStep = targetStep;
    renderStep();
    saveState();
  }

  /**
   * Render current step
   */
  function renderStep() {
    // Update progress bar (0% at step 1, 100% at step 4)
    const progressPercent = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
    if (progressBar) {
      progressBar.style.width = progressPercent + '%';
    }

    // Update sailboat position (moves within the 75% width bar)
    if (progressBoat) {
      progressBoat.style.left = progressPercent + '%';
      
      // Trigger wobble animation
      progressBoat.classList.remove('wobble');
      // Force reflow to restart animation
      void progressBoat.offsetWidth;
      progressBoat.classList.add('wobble');
      
      // Remove wobble class after animation completes to return to bobbing
      setTimeout(() => {
        progressBoat.classList.remove('wobble');
      }, 600); // Match animation duration
    }

    // Update progress steps
    progressSteps.forEach((step, index) => {
      const stepNumber = index + 1;
      
      // Remove all classes first
      step.classList.remove('active', 'completed', 'clickable');
      
      if (stepNumber < state.currentStep) {
        step.classList.add('completed', 'clickable');
      } else if (stepNumber === state.currentStep) {
        step.classList.add('active', 'clickable');
      } else {
        // Future steps - not clickable
        step.style.cursor = 'default';
      }
      
      // Set cursor style
      if (stepNumber <= state.currentStep) {
        step.style.cursor = 'pointer';
      } else {
        step.style.cursor = 'default';
      }
    });

    // Show/hide step containers
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

    // Update navigation buttons
    btnBack.style.display = state.currentStep === 1 ? 'none' : 'inline-block';
    
    if (state.currentStep === state.totalSteps) {
      btnNext.style.display = 'none';
      btnSubmit.style.display = 'inline-block';
    } else {
      btnNext.style.display = 'inline-block';
      btnSubmit.style.display = 'none';
    }

    // Show/hide conditional sections based on step
    const conditionalSections = document.querySelectorAll('[data-show-on-step]');
    conditionalSections.forEach(section => {
      const showOnStep = parseInt(section.getAttribute('data-show-on-step'));
      if (showOnStep === state.currentStep) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });

    // Update navigation button state
    updateNavigationState();

    // Scroll to top of form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Save state to sessionStorage
   */
  function saveState() {
    try {
      sessionStorage.setItem('quoteFormState', JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save form state:', e);
    }
  }

  /**
   * Load state from sessionStorage
   */
  function loadState() {
    try {
      const saved = sessionStorage.getItem('quoteFormState');
      if (saved) {
        const savedState = JSON.parse(saved);
        Object.assign(state, savedState);
        
        // Restore form values
        if (state.formData.package) {
          const packageRadio = form.querySelector(`input[name="package"][value="${state.formData.package}"]`);
          if (packageRadio) packageRadio.checked = true;
          updateDateConstraints();
          updateGuestsConstraints();
          updateAvailableExtras();
        }
        
        if (state.formData.date) {
          const dateInput = form.querySelector('#date');
          if (dateInput) dateInput.value = state.formData.date;
        }
        
        if (state.formData.guests) {
          const guestsInput = form.querySelector('#guests');
          if (guestsInput) guestsInput.value = state.formData.guests;
        }
        
        // Restore extras
        state.formData.extras.forEach(extraName => {
          const checkbox = form.querySelector(`input[name="${extraName}"]`);
          if (checkbox) checkbox.checked = true;
        });
        
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
      }
    } catch (e) {
      console.warn('Could not load form state:', e);
    }
  }

  /**
   * Handle form submission
   */
  function handleSubmit(e) {
    if (!validateCurrentStep()) {
      e.preventDefault();
      return false;
    }
    
    // Clear saved state on successful submission
    try {
      sessionStorage.removeItem('quoteFormState');
    } catch (e) {
      console.warn('Could not clear form state:', e);
    }
    
    // Form will submit normally to Cloudflare Worker
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
