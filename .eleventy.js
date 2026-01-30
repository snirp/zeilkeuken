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

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    }
  };
};
