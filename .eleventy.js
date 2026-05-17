const Image = require('@11ty/eleventy-img');

module.exports = function (eleventyConfig) {
  // Passthrough copy for assets
  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy('src/images');
  eleventyConfig.addPassthroughCopy('src/js');
  eleventyConfig.addPassthroughCopy('src/videos');

  // Favicons
  eleventyConfig.addPassthroughCopy('src/favicon-light.svg');
  eleventyConfig.addPassthroughCopy('src/favicon-dark.svg');
  eleventyConfig.addPassthroughCopy('src/apple-touch-icon.png');

  // Object values filter (for iterating keyed data objects in Nunjucks)
  eleventyConfig.addFilter('values', obj => Object.values(obj));

  // Markdown filter
  const markdownIt = require('markdown-it');
  const md = new markdownIt({
    html: true,
    breaks: true,
  });
  eleventyConfig.addFilter('markdown', content => {
    return md.render(content);
  });

  // Calculate end time from start time and duration
  eleventyConfig.addFilter('addHours', (timeString, hours) => {
    // Handle null/undefined/empty values
    if (!timeString || hours === null || hours === undefined || typeof timeString !== 'string') {
      return null;
    }

    // Parse time string
    const timeParts = timeString.split(':');
    if (timeParts.length !== 2) return null;

    const hoursStart = parseInt(timeParts[0], 10);
    const minutesStart = parseInt(timeParts[1], 10);

    if (isNaN(hoursStart) || isNaN(minutesStart)) return null;

    const totalMinutes = hoursStart * 60 + minutesStart + hours * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = Math.floor(totalMinutes % 60);

    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  });

  // Compute duration in hours between two "HH:MM" time strings
  eleventyConfig.addFilter('durationHours', (departure, endTime) => {
    if (!departure || !endTime) return null;
    const [dH, dM] = departure.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const diff = eH * 60 + eM - (dH * 60 + dM);
    if (diff <= 0) return null;
    return diff / 60;
  });

  // Filter FAQs by page tag and sort by priority
  eleventyConfig.addFilter('filterFaqs', function (faqs, page) {
    if (!faqs || !Array.isArray(faqs)) return [];
    return faqs
      .filter(faq => faq.tags && faq.tags.includes(page))
      .sort((a, b) => {
        const priorityA = (a.priority && a.priority[page]) || 99;
        const priorityB = (b.priority && b.priority[page]) || 99;
        return priorityA - priorityB;
      });
  });

  // Optimized image shortcode using eleventy-img
  // Usage: {% galleryImage "/images/foo.jpg", "Alt text", "sizes", "w1,w2,w3" %}
  // Sizes examples: "(min-width: 768px) 40vw, 100vw" | "50vw"
  // Widths: comma-separated px values, e.g. "480,960,1440"
  // Falls back to plain <img> for missing/placeholder images during development
  eleventyConfig.addAsyncShortcode(
    'galleryImage',
    async function (src, alt, sizes, widthsStr, loading) {
      const widths = widthsStr ? widthsStr.split(',').map(Number) : [480, 960];
      const srcPath = `./src${src}`;

      try {
        const metadata = await Image(srcPath, {
          widths,
          formats: ['webp', 'jpeg'],
          outputDir: './_site/images/',
          urlPath: '/images/',
        });

        return Image.generateHTML(metadata, {
          alt,
          sizes: sizes || '100vw',
          loading: loading || 'lazy',
          decoding: 'async',
        });
      } catch (e) {
        // Fallback for missing placeholder images in development
        return `<img src="${src}" alt="${alt}" loading="${loading || 'lazy'}">`;
      }
    }
  );

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
  };
};
