// Mobile menu functionality
(function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const menuClose = document.querySelector('.menu-close');
  const navMobile = document.querySelector('.nav-mobile');
  const menuOverlay = document.querySelector('.menu-overlay');
  const mobileLinks = document.querySelectorAll('.nav-mobile-link');
  
  function openMenu() {
    navMobile.classList.add('active');
    menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function closeMenu() {
    navMobile.classList.remove('active');
    menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  
  // Open menu
  if (menuToggle) {
    menuToggle.addEventListener('click', openMenu);
  }
  
  // Close menu
  if (menuClose) {
    menuClose.addEventListener('click', closeMenu);
  }
  
  // Close menu when clicking overlay
  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMenu);
  }
  
  // Close menu when clicking a link
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  
  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMobile.classList.contains('active')) {
      closeMenu();
    }
  });
})();

// Destinations map scroll animations
(function() {
  const destinationWrappers = document.querySelectorAll('.destination-card-wrapper');
  
  if (destinationWrappers.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px',
      threshold: 0.5
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const destination = entry.target.dataset.destination;
        const route = document.querySelector(`.route-${destination}`);
        const marker = document.querySelector(`.marker-${destination}`);
        
        if (entry.isIntersecting) {
          // Activate card and route
          entry.target.classList.add('in-view');
          if (route) route.classList.add('active');
          if (marker) marker.classList.add('active');
        } else {
          // Deactivate when scrolled away
          entry.target.classList.remove('in-view');
          if (route) route.classList.remove('active');
          if (marker) marker.classList.remove('active');
        }
      });
    }, observerOptions);
    
    destinationWrappers.forEach(wrapper => observer.observe(wrapper));
  }
})();
