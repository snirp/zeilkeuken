# Zeilkeuken

Website for dezeilkeuken.nl, a culinary sailing experience company in the Netherlands.

Static site built with [11ty (Eleventy)](https://www.11ty.dev/), deployed on Netlify.

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm

### Installation
```bash
npm install
```

### Development
```bash
npm start
```
Site runs at `http://localhost:8080` with live reload.

### Build
```bash
npm run build
```
Outputs to `_site/` directory.

## Documentation

- **[Architectural Decisions](docs/decisions.md)** - Major technical decisions and their rationale
- **[Copilot Instructions](.github/copilot-instructions.md)** - Development patterns, conventions, and project structure

## Deployment

Automatically deployed to Cloudflare on push to `master` branch.

---

**Stack:** 11ty • Nunjucks • Custom CSS • Cloudflare worker
