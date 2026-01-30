module.exports = function(eleventyConfig) {
  // Passthrough copy for assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/videos");

  // Markdown filter
  const markdownIt = require("markdown-it");
  const md = new markdownIt({ 
    html: true,
    breaks: true
  });
  eleventyConfig.addFilter("markdown", (content) => {
    return md.render(content);
  });

  // Calculate end time from start time and duration
  eleventyConfig.addFilter("addHours", (timeString, hours) => {
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
    
    const totalMinutes = hoursStart * 60 + minutesStart + (hours * 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = Math.floor(totalMinutes % 60);
    
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    }
  };
};
