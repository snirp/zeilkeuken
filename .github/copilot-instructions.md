# Copilot Instructions - Zeilkeuken

## Project Overview
Client website built with 11ty (Eleventy) static site generator. Project follows an iterative approach:
1. Start with HTML wireframes to establish structure and content
2. Progressively enhance with custom CSS for styling
3. Refine into production-ready website

**Tech Stack:** 11ty, Custom CSS, Nunjucks templating, Cloudflare Pages (hosting + Workers for serverless functions)
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
functions/         # Cloudflare Workers for form handling
.eleventy.js       # 11ty configuration
wrangler.toml      # Cloudflare Pages configuration (optional)
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
- Enables future CMS integration (planned: Decap CMS)
- HTML templates are the source of truth

**Example:**
```html
<h1 data-content-id="hero-title">Maak van jouw zeiltocht een culinaire belevenis</h1>
```

#### Content Synchronization Process

**Trigger command:** `Update content:` followed by pasted markdown

**Process:**
1. Parse markdown with `## data-content-id` headers and content
2. Find matching HTML elements with `data-content-id` attributes across all template files
3. Update text content while preserving HTML structure, tags, and all attributes
4. Report results:
   - ✅ Successfully updated content IDs
   - ❌ Content IDs from markdown without matching HTML elements

**Rules:**
- HTML templates are the source of truth (version controlled)
- Preserve: HTML structure, all attributes, element types
- Update: Text content only

**Input markdown format:**
```markdown
## data-content-id
Content text here
Can span multiple lines

## another-content-id
More content here
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

## CSS Architecture

### File Organization
CSS is split into 4 focused files with clear separation of concerns:
- **style.css** - Design tokens (CSS custom properties), reset, base layout, utility classes
- **components.css** - Reusable UI components (header, nav, footer, cards, modal)
- **forms.css** - Form-specific styles (quote forms, inputs, price calculator)
- **pages.css** - Page-specific layouts (hero, packages, timeline, FAQ)

Load order in base.njk: style → components → forms → pages

### Design System
**CSS Custom Properties:**
- Colors: Gray scale (100-800), white, black, purple
- Spacing: Five-scale system (xs, sm, md, lg, xl)
- Typography: Six font sizes (sm, base, md, lg, xl, 3xl)

**Responsive Strategy:**
- Mobile-first with two breakpoints: 768px (tablet), 1024px (desktop)
- Container max-width: 1200px

### Utility-First Approach
**Key principle:** Use utility classes for common patterns, component classes for unique UI

**Utilities available:**
- **Buttons:** Base class with size modifiers (sm, md, lg, full)
- **Cards:** Base card with interactive variant
- **Layouts:** Grid utilities (grid-2, grid-3, grid-4) and flex containers (flex-col, flex-col-sm)
- **Grids:** grid-2 (1→2 cols), grid-3 (1→3 cols), grid-4 (2→4 cols)
- **Gaps:** gap-xs, gap-sm, gap-md, gap-lg, gap-xl
- **Edge Bleeds:** bleed-left, bleed-right, bleed-both (breakout of container padding)
- **Width Constraints:** max-w-md (600px), max-w-lg (800px), max-w-xl (1000px)
- **Typography:** text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl
- **Lists:** list-check (checkmark list pattern for feature lists)
- **Badges:** Badge component with badge-group wrapper
- **Links:** Styled links (.link) for standalone links, (.text-link) for inline text links

**When to add new CSS:**
1. Check if utility classes can solve the need
2. For unique components, add to components.css (if reusable) or pages.css (if page-specific)
3. Always reference CSS custom properties for values
4. Keep selectors flat, avoid nesting

### Styling Conventions
- **Modern idiomatic CSS** - no BEM, no preprocessors
- **Mobile-first approach** - use `min-width` media queries
- **Avoid deep nesting** - keep specificity low, use flat selectors
- **Semantic naming** - descriptive class names that reflect purpose/content
- **Consistency** - all spacing, colors, and typography reference design tokens

## Component Patterns

### UI Component Strategy
**Use utility classes for:**
- Buttons (never create custom button styles)
- Card layouts (extend base card utilities)
- Badge groups (use badge-group wrapper with badge children)
- Grid layouts (use grid-2, grid-3, grid-4 utilities)

**Create component classes for:**
- Navigation (desktop and mobile menu)
- Header and footer
- Modal system
- Form-specific layouts (quote forms, price calculator)
- Page-specific sections (hero, timeline, FAQ)

### Card Pattern
Cards follow a consistent structure: header with title/price, badge group for tags, description text, and action button using utility classes.

### Button Pattern
Always use button utility classes with size modifiers. Never create custom button classes.

### Badge Pattern
Use badge-group as wrapper with badge children for all tag/label groups.
```

**Links:**
```html
<a href="#" class="link">Styled link</a>
<a href="#" class="text-link">Inline text link</a>
```

### CSS Conventions
- **Modern idiomatic CSS** - no BEM, no preprocessors
- **Mobile-first approach** - use `min-width` media queries
- **Avoid deep nesting** - keep specificity low, use flat selectors
- **Semantic naming** - descriptive class names that reflect purpose/content
- **Utility-first for layouts** - use grid/flex utilities instead of custom CSS
- **Component classes for unique UI** - header, nav, footer, modal
- All values reference CSS custom properties for consistency

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

### UI Component Strategy
**Use utility classes for:**
- Buttons (never create custom button styles)
- Card layouts (extend base card utilities)
- Badge groups (use badge-group wrapper with badge children)
- Grid layouts (use grid-2, grid-3, grid-4 utilities)

**Create component classes for:**
- Navigation (desktop and mobile menu)
- Header and footer
- Modal system
- Form-specific layouts (quote forms, price calculator)
- Page-specific sections (hero, timeline, FAQ)

### Card Pattern
Cards follow a consistent structure: header with title/price, badge group for tags, description text, and action button using utility classes.

### Button Pattern
Always use button utility classes with size modifiers. Never create custom button classes.

### Badge Pattern
Use badge-group as wrapper with badge children for all tag/label groups.

### Navigation
- Desktop: horizontal menu in header
- Mobile: hamburger icon triggers slide-in menu from right
- JavaScript: `src/js/menu.js` handles toggle, overlay, escape key, click-outside
- Smooth scroll: `html { scroll-behavior: smooth; }` for anchor links

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
- Handle submissions via **Cloudflare Workers** (serverless)
- Form files in `src/_includes/forms/`
- Workers in `functions/` directory (Cloudflare Pages convention)
- Use Wrangler CLI for local testing (`wrangler pages dev`)
- Forms submit to `/api/[function-name]` (Cloudflare Pages routing)

## Deployment (Cloudflare Pages)
- Automatic deployment from Git integration
- Build command: `npm run build`
- Build output directory: `_site`
- Functions directory: `functions/` (optional, auto-detected)
- Environment variables in Cloudflare Pages dashboard
- Custom domains and DNS managed in Cloudflare

## Architecture Evolution
**January 2026** - CSS consolidation and utility system
- Consolidated CSS from monolithic file into 4-file architecture
- Implemented utility-first approach for common patterns
- Established design token system with CSS custom properties
- Removed duplicate styles across components
- Result: Maintainable hybrid architecture balancing utilities and components

---
*Updated: January 2026*
