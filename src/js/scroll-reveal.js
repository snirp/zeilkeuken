/**
 * Scroll Reveal - Intersection Observer for fade-in animations
 * Respects prefers-reduced-motion for accessibility
 */

(function () {
  // Add js-enabled class to enable animations
  document.documentElement.classList.add('js-enabled');

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Exit early if reduced motion is preferred - show all items
  if (prefersReducedMotion) {
    document.querySelectorAll('.package-inclusions .list-check li').forEach(item => {
      item.classList.add('revealed');
    });
    return;
  }

  // Intersection Observer options
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -100px 0px', // Trigger 100px before element enters viewport
    threshold: 0.1,
  };

  // Callback function for intersection
  const handleIntersection = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Optional: stop observing after reveal (one-time animation)
        observer.unobserve(entry.target);
      }
    });
  };

  // Create observer
  const observer = new IntersectionObserver(handleIntersection, observerOptions);

  // Observe all elements with scroll-reveal class
  const revealElements = document.querySelectorAll('.scroll-reveal');
  revealElements.forEach(el => observer.observe(el));

  // Progressive reveal for list items
  const listObserverOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1,
  };

  const handleListIntersection = (entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const listItems = entry.target.querySelectorAll('li');
        listItems.forEach((item, index) => {
          setTimeout(() => {
            item.classList.add('revealed');
          }, index * 50); // 50ms stagger between items
        });
        observer.unobserve(entry.target);
      }
    });
  };

  const listObserver = new IntersectionObserver(handleListIntersection, listObserverOptions);

  // Observe all package inclusion lists
  const inclusionLists = document.querySelectorAll('.package-inclusions .list-check');
  inclusionLists.forEach(list => listObserver.observe(list));
})();
