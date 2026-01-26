# Architectural Decisions

## Tech Stack
- **11ty (Eleventy)** static site generator
- **Netlify** for hosting + serverless functions
- **Nunjucks** templating
- **Modern CSS** (no preprocessors, no BEM)

## Content Management
- **currently** Let copilot sync from markdown to data-content-id
- **future** Decap CMS

## CSS Architecture
- **4-file split:** style.css → components.css → forms.css → pages.css (load order matters)
- **Utility-first approach** for common patterns (buttons, cards, badges, grids)
- **Component classes** for unique UI (nav, header, footer, modal)
- **CSS custom properties** for all design tokens
- **Mobile-first** responsive (768px, 1024px breakpoints)

## i18n
- **Dutch-first** (nl-NL) with architecture ready for future English version
