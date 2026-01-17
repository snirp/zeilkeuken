# Copilot Instructions - Zeilkeuken

## Project Overview
Client website built with 11ty (Eleventy) static site generator. Project follows an iterative approach:
1. Start with HTML wireframes to establish structure and content
2. Progressively enhance with custom CSS for styling
3. Refine into production-ready website

**Tech Stack:** 11ty, Custom CSS, Nunjucks templating, Netlify (hosting + serverless functions)
**Language:** Dutch (nl-NL) - English support planned for future

## Project Structure (11ty conventions)
```
src/               # Source files
  _includes/       # Reusable templates, layouts, partials
    layouts/       # Page layouts (base.njk is main layout)
  _data/           # Global data files (JSON, JS)
    content.md     # Content management with data-content-id system
  css/             # Custom stylesheets
  js/              # JavaScript files (menu.js)
  images/          # Image assets
  index.njk        # Homepage
  ervaar/          # Folder-per-page structure
    index.njk      # Experience page
  keuken/          # Kitchen page
  # ... other pages follow same pattern
netlify/
  functions/       # Serverless functions for form handling
.eleventy.js       # 11ty configuration
netlify.toml       # Netlify deployment config
package.json       # Dependencies and scripts
_site/             # Generated output (git-ignored)
```

### Page Structure
- **Folder-per-page approach:** Each page lives in its own folder (e.g., `src/ervaar/index.njk`)
- **Homepage exception:** `src/index.njk` at root level
- All pages extend `layouts/base.njk`

## Development Workflow

### Setup
```bash
npm install
npm start          # Development server with live reload
```

### Common Commands
```bash
npm start          # Dev server at localhost:8080 (or configured port)
npm run build      # Production build to _site/
npx @11ty/eleventy --serve --watch  # Alternative dev command
```

## 11ty Templating Patterns (Nunjucks)

### Layout System
- **Base layout:** `_includes/layouts/base.njk` is the main layout
- **Template inheritance:** Use `{{ content | safe }}` in layout to render child content
- **NOT using block syntax:** Avoid `{% block content %}` - use front matter layout instead
- Apply via front matter: `layout: layouts/base.njk`
- Layouts can chain: `layout: layouts/post.njk` → extends base
- All content in Dutch (nl-NL) - use proper Dutch HTML lang attribute

**Example page template:**
```njk
---
layout: layouts/base.njk
title: Page Title
---

<section>
  <!-- Page content here -->
</section>
```

### Navigation & Active States
- Desktop navigation: horizontal menu (≥768px)
- Mobile navigation: hamburger menu with slide-in drawer (<768px)
- Active page detection: `{% if page.url == '/ervaar/' %} active{% endif %}`
- Legal pages (privacy, terms, accessibility): footer-only, excluded from mobile menu

### Data Cascade
- Page-level data: front matter in template files
- Directory data: `<dirname>.json` applies to all files in directory
- Global data: `_data/` folder (e.g., `site.json`, `navigation.js`)
- Store Dutch content strings in `_data/` for easy future i18n expansion

### Content Management System
- **data-content-id attributes:** All editable content marked with `data-content-id="unique-id"`
- **Content source:** `src/_data/content.md` - markdown file with content mapped to IDs
- **Format:** `## data-content-id` headers followed by content
- Enables future CMS integration (planned: Decap CMS)
- LLM-friendly format for content updates and synchronization

**Example:**
```html
<h1 data-content-id="hero-title">Maak van jouw zeiltocht een culinaire belevenis</h1>
```

### Includes & Partials
```njk
{% include "components/header.njk" %}
{% include "partials/nav.njk" %}
{% include "forms/contact-form.njk" %}
```

### Filters & Shortcodes
- Define custom filters in `.eleventy.js`
- Use for date formatting (Dutch locale), URL manipulation, content transformation

## CSS Conventions
- **Modern idiomatic CSS** - no BEM, no preprocessors
- **Mobile-first approach** - use `min-width` media queries
- **Avoid deep nesting** - keep specificity low, use flat selectors
- **Semantic naming** - descriptive class names that reflect purpose/content
- Use CSS custom properties (variables) for colors, spacing, typography
- Organize by component or page as project grows
- Passthrough copy for assets: configured in `.eleventy.js`

**Responsive breakpoints:**
- Mobile: default (base styles)
- Tablet: `@media (min-width: 768px)`
- Desktop: `@media (min-width: 1024px)`
- Container max-width: `1200px`

**Example structure:**
```css
/* Good: flat, semantic, mobile-first */
.hero-section { /* mobile styles */ }
@media (min-width: 768px) {
  .hero-section { /* tablet+ styles */ }
}

/* Avoid: deep nesting */
.container .section .content .item { } /* ❌ */
```

## Component Patterns

### Badge Component
```html
<div class="destination-badges">
  <span class="badge">Badge text</span>
  <span class="badge">Another badge</span>
</div>
```

### Card Structure
- Header: title + optional price/meta
- Badges: `<div class="[type]-badges">` with badge spans
- Description: content paragraph(s)
- CTA: button or link for action

### Navigation
- Desktop: horizontal menu in header
- Mobile: hamburger icon triggers slide-in menu from right
- JavaScript: `src/js/menu.js` handles toggle, overlay, escape key, click-outside
- Smooth scroll: `html { scroll-behavior: smooth; }` for anchor links

### Section IDs
Homepage sections have single-word IDs for anchor navigation:
- `#hero` - Hero section with main CTA
- `#proposition` - Value proposition
- `#destinations` - Sailing destinations
- `#food` - Food/kitchen offering
- `#packages` - Package options
- `#why` - Why choose us
- `#testimonials` - Customer reviews
- `#cta` - Call to action

## Key Configuration (.eleventy.js)
```js
module.exports = function(eleventyConfig) {
  // Passthrough copy for assets
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/images");
  
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    }
  };
};
```

## Forms & Serverless Functions
- Forms: contact form, quote request
- Handle submissions via **Netlify Functions** (serverless)
- Form files in `src/_includes/forms/`
- Functions in `netlify/functions/`
- Use `netlify-lambda` or Netlify CLI for local testing
- Forms submit to `/.netlify/functions/[function-name]`

**Example form action:**
```html
<form action="/.netlify/functions/contact" method="POST">
```

## Deployment (Netlify)
- Configure build in `netlify.toml`
- Build command: `npm run build`
- Publish directory: `_site`
- Functions directory: `netlify/functions`
- Environment variables in Netlify dashboard

## Iterative Development Notes
- **Wireframe phase:** Focus on semantic HTML, Dutch content, accessibility
- **Styling phase:** Apply mobile-first CSS, refine visual hierarchy
- **Production phase:** Optimize images, configure Netlify, test forms, add meta tags/SEO (Dutch)

---
*Update as project patterns emerge*
