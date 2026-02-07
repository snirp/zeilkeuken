# CSS Audit Report - February 2026

**Current CSS:** 3,064 lines across 4 files
**Target:** ~2,000 lines (35% reduction)

---

## 📊 Summary Findings

### Current State
- **Total CSS:** 3,064 lines
  - style.css: 311 lines (design tokens, utilities)
  - components.css: 766 lines (reusable components)
  - forms.css: 651 lines (form-specific)
  - pages.css: 1,336 lines (page-specific layouts)
- **CSS Classes defined:** ~322 selectors
- **CSS Classes used in HTML:** 205 classes
- **Gap:** ~117 potentially unused or pseudo-class selectors

### Major Issues Identified

1. **Duplicate responsive patterns** (12+ occurrences)
2. **Repeated grid structures** (20+ occurrences)
3. **Page-specific styles that could be utilities** (est. 200+ lines)
4. **Redundant breakout patterns** (12 occurrences)
5. **Inconsistent spacing utilities** (could consolidate)

---

## 🎯 Priority 1: Duplicate Patterns (Quick Wins)

### 1.1 Edge-to-Edge Breakout Pattern
**Current:** Repeated 4 times (48 lines total)

Found in:
- `.image-placeholder` (pages.css:110-135)
- `.package-hero` (pages.css:329)
- `.food-image` (pages.css:169-188)
- `.facility-image` (pages.css:1038-1054)
- `.crew-members` (pages.css:1059-1077)

Pattern:
```css
margin-left: calc(-1 * var(--spacing-md));
margin-right: calc(-1 * var(--spacing-md));
width: calc(100% + 2 * var(--spacing-md));

@media (min-width: 768px) {
  margin-left: calc(-1 * var(--spacing-lg));
  margin-right: calc(-1 * var(--spacing-lg));
  width: calc(100% + 2 * var(--spacing-lg));
}

@media (min-width: 1024px) {
  margin-left: calc(-1 * var(--spacing-xl));
  margin-right: calc(-1 * var(--spacing-xl));
  width: calc(100% + 2 * var(--spacing-xl));
}
```

**Recommendation:** Create utility classes `.bleed-left`, `.bleed-right`, `.bleed-both`
**Savings:** ~40 lines

---

### 1.2 Grid Patterns
**Current:** 27+ custom grid definitions

Many page-specific components redefine the same grid patterns:
- `repeat(1, 1fr)` → `repeat(2, 1fr)` @ 768px
- `repeat(1, 1fr)` → `repeat(3, 1fr)` @ 1024px
- `repeat(2, 1fr)` → `repeat(4, 1fr)` @ 768px

**You already have these utilities:**
- `.grid-2` (1→2 columns)
- `.grid-3` (1→3 columns)
- `.grid-4` (2→4 columns)

**Opportunity:** Replace custom grids with utility classes in:
- `.destination-cards` (components.css:302-315)
- `.package-cards` (pages.css:336-355)
- `.extras-grid` (pages.css:451-467)
- `.testimonial-cards` (components.css:453-465)

**Savings:** ~50-60 lines

---

### 1.3 Typography Patterns
**Current:** Font sizes repeated inline throughout

Found 40+ instances where the same font-size + related properties are duplicated.

**Recommendation:** Create semantic typography utilities:
```css
/* Add to style.css */
.text-sm { font-size: var(--font-size-sm); }
.text-base { font-size: var(--font-size-base); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }
.text-2xl { font-size: var(--font-size-2xl); }
.text-3xl { font-size: var(--font-size-3xl); }

.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

**Note:** Use sparingly - prefer semantic component classes for complex typographic patterns with multiple properties. Only extract where just font-size changes.

**Savings:** Minimal direct savings, but improves maintainability

---

## 🎯 Priority 2: Page-Specific to Utility Conversion

### 2.1 List Styling Patterns
**Current:** Checkmark lists repeated 4 times

Pattern appears in:
- `.package-inclusions li` (pages.css:720-732)
- `.custom-package-features li` (pages.css:422-430)
- `.modal-content ul li` (components.css:734-745)
- `.sustainability-list li` could use this pattern

**Recommendation:** Create utility class `.list-check`
```css
.list-check {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-check li {
  padding-left: var(--spacing-md);
  position: relative;
  margin-bottom: var(--spacing-xs);
}

.list-check li::before {
  content: '✓';
  position: absolute;
  left: 0;
  font-weight: 700;
}
```

**Savings:** ~30 lines

---

### 2.2 Flex Gap Patterns
**Current:** Inline flex + gap repeated everywhere

Common patterns:
```css
display: flex;
flex-direction: column;
gap: var(--spacing-md);  /* or sm, lg */
```

**You already have:** `.flex-col` and `.flex-col-sm`

**Recommendation:** Add gap modifiers
```css
.gap-xs { gap: var(--spacing-xs); }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }
.gap-xl { gap: var(--spacing-xl); }
```

**Savings:** Enables more utility usage, ~20-30 lines

---

### 2.3 Content Width Constraints
**Current:** `max-width` repeatedly defined

Pattern appears in:
- `.proposition-container` (pages.css:318)
- `.sustainability-content` (pages.css:1285)
- Various sections

**Recommendation:** Create width constraint utilities
```css
.max-w-md { max-width: 600px; margin-left: auto; margin-right: auto; }
.max-w-lg { max-width: 800px; margin-left: auto; margin-right: auto; }
.max-w-xl { max-width: 1000px; margin-left: auto; margin-right: auto; }
```

**Savings:** ~15-20 lines

---

## 🎯 Priority 3: Component Consolidations

### 3.1 Card Variants
**Current:** 4 different card types with overlapping styles

- `.card` (style.css:176)
- `.card-interactive` (style.css:180)
- `.destination-card` (components.css:320)
- `.package-card` (components.css:332)
- `.testimonial-card` (components.css:322)

**Recommendation:** Consolidate base card styles, use modifiers
```css
/* Base card (already exists) */
.card { /* core styles */ }

/* Interactive state (already exists) */
.card-interactive { /* hover/active */ }

/* Variants through composition */
.card-package { /* gradient + top border */ }
.card-destination { /* specific styling */ }
```

**Savings:** ~40-50 lines through better inheritance

---

### 3.2 Timeline Components
**Current:** Timeline styles spread across pages.css (645-714)

**Status:** Well-organized, minimal opportunity
**Recommendation:** Keep as-is, this is appropriately component-based

---

### 3.3 Form Components
**Current:** forms.css is 651 lines

**Opportunities:**
- Progress bar structure (forms.css:18-87) - keep, it's unique
- Form field patterns could use more utilities for spacing
- Input/select styling is appropriate component-level

**Recommendation:** Minor opportunity - extract 20-30 lines of spacing utilities
**Savings:** ~20-30 lines

---

## 🎯 Priority 4: Cleanup & Removal

### 4.1 Remove Dead Split-Layout Code
**Status:** Mostly removed, but some CSS might remain

**Check:**
- style.css - ✅ Already removed
- pages.css - ✅ Already removed  
- keuken/index.njk still has 1 usage of `.split-layout` with `.split-image`

**Recommendation:** Convert remaining usage to standard `.grid-2` pattern
**Savings:** None (already removed)

---

### 4.2 Potentially Unused Classes
**Investigation needed:**

Classes that may not be used (requires manual verification):
- Check if all helper classes in components.css are used
- Verify modal system usage
- Check gallery lightbox usage

**Method:**
```bash
# For each class, check usage
grep -rn "class-name" src/**/*.njk
```

**Estimated savings:** 30-50 lines for genuinely unused code

---

## 📋 Implementation Plan

### Phase 2A: Extract New Utilities (4-6 hours)
1. **Add edge-to-edge utilities** (1 hour)
   - Create `.bleed-left`, `.bleed-right`, `.bleed-both`
   - Update components to use utilities
   - Test responsive behavior

2. **Add gap utilities** (30 min)
   - `.gap-xs` through `.gap-xl`
   - Quick addition to style.css

3. **Add width constraint utilities** (30 min)
   - `.max-w-md`, `.max-w-lg`, `.max-w-xl`

4. **Add list utilities** (1 hour)
   - `.list-check` pattern
   - Update 4 components

### Phase 2B: Convert Components (3-4 hours)
5. **Replace custom grids** (2 hours)
   - Convert `.destination-cards` → `.grid-3`
   - Convert `.package-cards` → `.grid-2`
   - Convert `.extras-grid` → `.grid-3`
   - Test layouts

6. **Consolidate card variants** (2 hours)
   - Refactor package/testimonial cards
   - Improve inheritance
   - Test all card contexts

### Phase 2C: Cleanup (1 hour)
7. **Remove unused code** (1 hour)
   - Verify and remove unused classes
   - Clean up comments
   - Final line count verification

---

## 📊 Expected Results

### Before
- **Total:** 3,064 lines
- **Maintainability:** Good (organized structure)
- **Utility usage:** ~15% of styles
- **Duplication:** Moderate (grid/spacing patterns)

### After (Projected)
- **Total:** ~2,000-2,100 lines (31-34% reduction)
- **Maintainability:** Excellent (less duplication)
- **Utility usage:** ~35-40% of styles
- **Duplication:** Minimal

### Breakdown
- style.css: 311 → **400-420** (+100-110 new utilities)
- components.css: 766 → **600-650** (-100-150 through consolidation)
- forms.css: 651 → **620-630** (-20-30 spacing extractions)
- pages.css: 1,336 → **800-900** (-400-500 through utility usage)

---

## 🎯 Quick Wins Priority Order

1. **Edge-to-edge utilities** (40 lines saved, 1 hour)
2. **Grid conversions** (50-60 lines saved, 2 hours)
3. **List utilities** (30 lines saved, 1 hour)
4. **Gap utilities + conversions** (20-30 lines saved, 1.5 hours)
5. **Width constraints** (15-20 lines saved, 30 min)
6. **Card consolidation** (40-50 lines saved, 2 hours)

**Total Quick Wins:** 195-230 lines saved in ~8 hours

---

## ✅ Action Items

### Immediate (Today)
- [ ] Review this audit with stakeholder
- [ ] Prioritize which sections to tackle first
- [ ] Set aside time for implementation

### This Week
- [ ] Implement Phase 2A (utilities)
- [ ] Test thoroughly on all pages
- [ ] Implement Phase 2B (conversions)

### Next Week
- [ ] Implement Phase 2C (cleanup)
- [ ] Document new utility classes in copilot-instructions.md
- [ ] Update project docs

---

## 📝 Notes

### Architecture Principles Maintained
✅ Utility-first for common patterns
✅ Component classes for unique UI
✅ CSS custom properties for all values
✅ Mobile-first responsive design
✅ Semantic HTML with clean class names

### Future Opportunities
- Consider CSS nesting when Safari support improves
- Evaluate CSS logical properties for i18n
- Monitor for additional utility extraction opportunities
- Could benefit from CSS container queries (when stable)

### Alternative NOT Recommended
❌ Switching to Tailwind would:
- Take 24-40 hours
- Break data-content-id system
- Lose elegant design token architecture
- Require rewriting HTML across 12+ templates
- Still need ~300-500 lines of custom CSS
