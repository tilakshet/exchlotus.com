# Chaska99 — Dashboard UI Guidelines

## 1. Context and Goals

**Design intent:** Chaska99's authenticated dashboard surface must render a very high density of links and buttons (game/provider tiles) as a dark, high-contrast, keyboard-navigable interface without sacrificing WCAG 2.2 AA compliance.

- **Brand:** Chaska99 — [chaska99.com](https://chaska99.com/)
- **Audience:** Authenticated users and operators (confidence: low — see §7.1, verify before shipping)
- **Product surface:** Dashboard web app
- **Confirmed brand context:** Live-site review of chaska99.com shows a sportsbook/exchange/live-casino/casino platform for Indian users, dark-navy/black base with orange/gold CTA accents and cyan/pink marketing highlights. This is consistent with the supplied `surface.base` (#000000) and `surface.raised` (#ff7300) tokens for the dashboard surface. Cyan/pink marketing accents observed on the public site are **not** part of the supplied dashboard token set and must not be introduced into dashboard components without an explicit new token.
- **Known density:** this dashboard template renders **176 links, 141 buttons, 6 lists, 3 inputs, 1 navigation region, 1 table** on a single view. Every component rule below is written for that density, not for a sparse page.

---

## 2. Design Tokens and Foundations

All component guidance below must reference these semantic tokens by name. Raw hex/px values must never appear in component-level guidance or code review comments — only token names.

### 2.1 Typography

```css
--font-family-primary: Roboto;
--font-family-stack: Roboto, sans-serif;
--font-weight-base: 400;
--font-size-xs: 10px;   /* == font.size.base / font.lineHeight.base: 15px */
--font-size-sm: 12px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 22px;
--line-height-base: 15px;
```

- Body copy, form labels, and any single-line-of-meaning text **must** use `font.size.md` (14px) or larger. `font.size.xs`/`sm` are reserved for secondary meta text (badges, tags, timestamps, counts) — never for the only copy conveying an action or state.
- Headings use `font.size.xl`/`2xl`; there is no token above 22px. If a page needs a hero-level heading, that is a **missing token**, not a license to hardcode a larger size — request a token addition instead.
- `line-height.base` (15px) is tuned for `font.size.xs` (10px/1.5 ratio). Any size above `xs` **must** scale line-height proportionally (≈1.4–1.5×) rather than reusing 15px verbatim, or descenders on 16–22px text will clip.

### 2.2 Color

```css
--color-text-primary: #212529;    /* dark text — see pairing rule below */
--color-text-secondary: #ffffff;  /* light text — see pairing rule below */
--color-surface-base: #000000;
--color-surface-raised: #ff7300;
```

**Verified pairing rule (must):** contrast was computed against WCAG 2.2 AA (4.5:1 normal text, 3:1 large text/UI):

| Text token | Surface token | Contrast ratio | AA normal text | Use |
|---|---|---|---|---|
| `color.text.secondary` (#ffffff) | `color.surface.base` (#000000) | 21:1 | Pass | **Default body/label text on the base dashboard background** |
| `color.text.primary` (#212529) | `color.surface.raised` (#ff7300) | 6.1:1 | Pass | **Default text on raised/accent surfaces** (buttons, promo cards, badges) |
| `color.text.primary` (#212529) | `color.surface.base` (#000000) | ~1.3:1 | **Fail** | Never pair — near-invisible |
| `color.text.secondary` (#ffffff) | `color.surface.raised` (#ff7300) | 2.75:1 | **Fail** | Never pair — fails even large-text AA |

This is the single most important rule in this document: **`text.secondary` is the on-dark token, `text.primary` is the on-raised token.** The names invert the usual "primary = default" convention because they were extracted directly from computed styles; do not rename them, but never swap the pairing above. Any component spec below that says "text on base" means `text.secondary`; "text on raised" means `text.primary`.

No other colors (including the cyan/pink seen on the marketing site) exist in this token set. If a component needs a state color (success/error/warning) that isn't derivable from these four tokens, that is a **missing token** to raise, not a reason to hardcode a hex value.

### 2.3 Spacing

```css
--space-1: 3px;
--space-2: 5px;
--space-3: 6px;
--space-4: 10px;
--space-5: 15px;
--space-6: 20px;
--space-7: 25px;
--space-8: 40px;
```

This scale is non-uniform by design (extracted, not generated) — treat it as closed. Component padding/gaps must snap to one of these eight values. No arbitrary px value (e.g. `7px`, `12px`) may appear in implementation, even "just this once."

### 2.4 Radius / Shadow / Motion

```css
--radius-xs: 1.5px;
--radius-sm: 4px;
--radius-md: 5px;
--radius-lg: 50px;   /* pill/circular — avatars, pill buttons, badges */
--motion-duration-instant: 300ms;
--motion-duration-fast: 600ms;
```

- `radius.lg` (50px) is a pill/circle radius, not a "large card" radius — reserve it for fully-rounded controls (pill buttons, avatar, status dot), not panels.
- No shadow tokens were supplied. Do not invent elevation shadows; use `surface.raised` color and border/outline to communicate elevation instead.
- **Verify before use:** `motion.duration.instant` (300ms) is slower than conventional "instant" feedback (typically ≤150ms). At dashboard density (141 buttons), a 300ms delay on hover/press feedback will read as sluggish. Until re-confirmed against source, use `instant` only for state transitions the user isn't actively driving (e.g., a tooltip appearing), and prefer no transition (0ms) for direct manipulation feedback (pressed state) rather than stretching this token's intent.

---

## 3. Component Rules

Ordered by density on this page type: Link, Button, List, Table, Navigation, Input.

### 3.1 Link (176 instances/page)

**Anatomy:** text label (required, descriptive) + optional leading icon. At this density, links are predominantly game-tile/provider-tile titles and footer/menu links.

**Variants:** inline (within body text) · standalone (tile/card title) · menu (nav/footer list item).

**States:**

| State | Spec |
|---|---|
| Default | `color.text.secondary` on `surface.base`; no underline for standalone/menu links, underline for inline links (underline is the only differentiator from body text when color alone can't be relied on) |
| Hover | Add underline (if not already present) **and** a visible color shift is not available in-palette, so hover must be communicated via underline + `motion.duration.instant` — color alone must not be the only hover signal |
| Focus-visible | `outline: 2px solid var(--color-text-secondary)` (or `--color-surface-raised` on dark surface) offset ≥2px; outline must never be `outline: none` without a replacement indicator |
| Active | Pressed state uses no added transition (see §2.4) — instant visual feedback |
| Disabled | Rare for links; if a link must appear non-actionable, remove it or convert to plain text — do not style a still-clickable link as "disabled" |
| Loading | N/A for links; if a link triggers async navigation, show a page-level loading indicator, not a per-link spinner |
| Error | If a link target is known-broken, remove it before shipping — links have no error state |

**Keyboard / pointer / touch:** standard `<a>` semantics — `Enter` activates, natural `Tab` order, no custom `role="link"` on non-anchor elements. Touch target ≥24×24px hit area even if the visible label is smaller (pad with `space.2`/`space.3` if the label is icon-only or short).

**Responsive / edge cases:**
- **Long content:** truncate game/provider titles with `text-overflow: ellipsis` at 1 line inside tiles; the full title must still be available via the accessible name (don't truncate the `aria-label`/underlying text, only the visual render).
- **Empty state:** a tile grid with zero links (e.g., no games match a filter) must render an explicit empty-state message, never a blank grid.
- **Density edge case (must):** 176 links on one page **must** be grouped under landmark regions (e.g., one `<nav>`/`<section aria-label>` per game category) so keyboard/screen-reader users can jump between groups instead of tabbing through all 176 sequentially. A "skip to main content" link must precede the first group.

---

### 3.2 Button (141 instances/page)

**Anatomy:** label (required, verb-first, e.g. "Play Now", not "Games") + optional icon. Given the tile density, most buttons are the CTA on a game/provider card.

**Variants:** primary (raised/filled, `surface.raised` background) · secondary (outlined, `surface.base` background with border) · pill (radius.lg, used for compact tags like "Live", "New").

**States:**

| State | Spec |
|---|---|
| Default | Primary: bg `surface.raised`, text `text.primary` (see §2.2 pairing rule — never `text.secondary` on this bg). Secondary: bg `surface.base`, text `text.secondary`, 1px border in `text.secondary` |
| Hover | Primary: no darker/lighter tone exists in-palette — signal hover via border addition or `radius` inset shadow-free outline, not color shift; do not fabricate a hover tint hex |
| Focus-visible | 2px outline, offset ≥2px, in the color that contrasts with the button's own background (use `text.secondary` outline on primary buttons, since an `surface.raised`-colored outline on a `surface.raised` button would be invisible) |
| Active/pressed | Instant, no transition delay |
| Disabled | Reduce opacity to a level that still meets non-text contrast ≥3:1 against `surface.base` for the button boundary (do not drop below that threshold just to look "greyed out"); `aria-disabled="true"` and remove from tab order only if truly non-actionable, otherwise keep focusable with an explanatory `aria-describedby` |
| Loading | Replace label with a spinner **and** keep an accessible label (`aria-label="Loading"` or visually-hidden text) — never a bare spinner with no text alternative; button must be disabled/`aria-busy="true"` during load to prevent duplicate submits |
| Error | For action buttons that fail (e.g., "Add funds" fails), return focus to the button, surface the error inline adjacent to it, and keep the label reset to its pre-action state — never leave a button stuck on "Loading" |

**Keyboard / pointer / touch:** `Enter`/`Space` activate; pointer `click`; touch tap. Minimum touch target 24×24px (WCAG 2.2 AA 2.5.8), enforced via padding using `space` tokens even when the visual label is small — this matters specifically because 141 buttons/page invites cramming.

**Responsive / edge cases:**
- **Long content:** button labels must wrap to a second line rather than overflow the container at narrow viewports; never truncate a call-to-action label.
- **Empty/edge:** a disabled primary CTA (e.g., "Play Now" on a maintenance game) must say why inline ("Under maintenance"), not just grey out silently.

---

### 3.3 List (6 instances/page)

**Anatomy:** semantic `<ul>`/`<ol>` with `<li>` items; used for things like payment-method rows, provider category lists.

**States:** default / hover (if items are interactive) / focus-visible (on interactive items only) / empty.

**Responsive / edge cases:**
- Long lists (e.g., all providers) should support virtualization or pagination — with only 6 lists/page this is lower-risk than the link/button density, but any list bound to server data (not a fixed 5–10 items) must still handle empty and loading states explicitly.
- Empty state: explicit "No items" message with the same text/surface token pairing as body copy — never an empty `<ul>` with no visual trace.

---

### 3.4 Table (1 instance/page)

**Anatomy:** `<table>` with `<thead>`, sortable column headers where applicable, `<tbody>` rows. Given there's exactly one table, it likely carries transactional or reporting data (bet history, ledger) — treat every cell as financially/operationally meaningful, not decorative.

**States:** row default / row hover / row focus (keyboard row navigation if interactive) / sort-active column header / loading (skeleton rows, not a spinner replacing the whole table) / empty (explicit "No records" row spanning all columns) / error (inline banner above the table, table itself still renders headers).

**Keyboard / pointer / touch:** column headers acting as sort controls must be real `<button>`s inside `<th>`, keyboard-operable, with `aria-sort` reflecting current state. Row actions (if any) must be reachable via `Tab` without requiring a mouse hover to reveal them.

**Responsive / edge cases:**
- On narrow viewports, prefer horizontal scroll with a visible scroll affordance over silently hiding columns; if columns are hidden, provide an explicit "show more" per row.
- Long cell content (e.g., long transaction IDs) truncates visually with full value in `title`/accessible text, matching the Link truncation rule in §3.1.

---

### 3.5 Navigation (1 instance/page)

**Anatomy:** single primary `<nav>` landmark containing the dashboard's top-level sections.

**States:** default item / hover / focus-visible / current-page (`aria-current="page"`) / disabled (section gated behind KYC/permissions — show as visibly locked with a reason, not silently omitted, since operators specifically need to know a section exists but is gated).

**Keyboard / pointer / touch:** full nav must be traversable via `Tab`/`Shift+Tab`; if it's a menu with submenus, arrow-key support within the open submenu is required, `Escape` closes it and returns focus to the trigger.

**Responsive / edge cases:** collapses to a disclosure (hamburger) pattern below the dashboard's defined breakpoint; the collapsed trigger must have an accessible name ("Open navigation") and `aria-expanded` state — not just an icon.

---

### 3.6 Input (3 instances/page)

**Anatomy:** label (always visible, never placeholder-only) + input control + optional helper/error text.

**States:**

| State | Spec |
|---|---|
| Default | Border in `text.secondary` on `surface.base` background |
| Hover | Border weight/opacity increase only — no color outside token set |
| Focus-visible | 2px outline per the same rule as Button/Link |
| Active (typing) | No distinct visual beyond focus-visible |
| Disabled | Reduced-opacity border, `aria-disabled`, label remains fully legible (never dim the label — only the control) |
| Loading | If the input triggers async validation (e.g., checking a promo code), show an inline spinner inside the input, input remains editable unless the action truly locks it |
| Error | Border and helper text switch to signal error **without relying on color alone** (add an icon + text, e.g. "Invalid promo code") since no error-red token exists in this set — raise this as a missing token if error states recur |

**Keyboard / pointer / touch:** standard text-input behavior; label `for`/`id` association mandatory; error text linked via `aria-describedby`.

**Responsive / edge cases:** with only 3 inputs/page, each is likely high-stakes (search, promo code, amount) — every one must validate on blur at minimum, not only on form submit, given financial/operational context.

---

## 4. Accessibility Requirements — Testable Acceptance Criteria

| # | Rule | Pass condition | Fail condition |
|---|---|---|---|
| A1 | Text/surface pairing | Every rendered text node resolves to one of the two passing pairs in §2.2 | Any instance of `text.primary` on `surface.base`, or `text.secondary` on `surface.raised` |
| A2 | Focus visibility | Every interactive element (176 links + 141 buttons + 3 inputs + nav items + table controls) shows a ≥2px outline with ≥3:1 contrast against its background when focused via keyboard | Any element with `outline: none`/`0` and no replacement indicator |
| A3 | Keyboard reachability | Full page is operable via `Tab`/`Shift+Tab`/`Enter`/`Space`/arrow keys with no mouse, in a logical order matching visual layout | Any interactive element unreachable by keyboard, or a focus trap |
| A4 | Landmark grouping | Link-heavy sections (§3.1) are each wrapped in a labeled landmark; a skip link exists before the first landmark | Screen-reader users must tab through >20 links with no grouping/skip mechanism |
| A5 | Touch target size | Every button/link/input has an effective hit area ≥24×24px (WCAG 2.2 AA 2.5.8) | Any tappable control measurably smaller with no padding compensation |
| A6 | No color-only signaling | Hover/error/current-state on links, buttons, inputs, nav each pair a non-color cue (underline, icon, text, border) with any color change | Any state distinguishable by color shift alone |
| A7 | Loading accessibility | Every async button/input exposes `aria-busy`/equivalent text alternative during load | A spinner with no text alternative and no `aria-busy` |
| A8 | Empty states | Every list/table/link-grid has an explicit, styled empty-state message | Blank container with no content and no message on zero-data |

---

## 5. Content and Tone Standards

Writing tone: **concise, confident, implementation-focused.** Applies to all UI copy (labels, empty states, errors), not just this document.

- **Do:** "Play Now", "Add funds", "No transactions yet", "Invalid promo code — check and try again."
- **Don't:** "Click here", "Learn more" (as a sole link label with no context), "Something went wrong" (with no next step), "Submit" (on a financial action — name the action: "Confirm withdrawal").
- Every button/link label must describe the action or destination on its own, without relying on surrounding visual context — screen-reader users hearing "Play Now" out of a list of 40 identical "Play Now" buttons need the accessible name to include the game title (e.g., visually "Play Now", accessible name "Play Now — Aviator").

---

## 6. Anti-Patterns and Prohibited Implementations

- **Do not** pair `text.primary` with `surface.base`, or `text.secondary` with `surface.raised` (§2.2) — this is the single highest-severity error this palette makes easy to introduce.
- **Do not** hardcode any hex/px value in component code; every value must trace to a token in §2.
- **Do not** invent a hover-tint color by lightening/darkening a token in CSS (`filter: brightness()`, ad hoc rgba overlays) — this creates untracked one-off colors. Signal hover with underline/border/outline changes instead until a hover token is added to the system.
- **Do not** let 176 links or 141 buttons sit in a flat, unlabeled DOM structure — this is an accessibility failure at this density even if each individual component is otherwise correct.
- **Do not** ship a spinner-only loading state with no accessible text.
- **Do not** use `radius.lg` (50px) on rectangular panels/cards — it's a pill/circle radius only.
- **Do not** introduce the marketing site's cyan/pink accents into the dashboard — they are not in this token set.

---

## 7. Verification Items (do not ship before resolving)

7.1 **Audience/surface confidence is low** per extraction diagnostics. Confirm with product/design whether "dashboard" here means the authenticated player dashboard, an operator/admin dashboard, or both — the component density profile (176 links/141 buttons, almost no inputs/tables) reads like a **game-lobby-style player dashboard**, not an operator admin panel (which would typically have far more tables/inputs, few links). If this is actually meant for operators, re-derive the density profile before applying §3 as-is.

7.2 **Contrast contradiction in source tokens** (§2.2): `text.primary` on `surface.base` fails AA by a wide margin (~1.3:1). This guide resolves it via the pairing rule, but the underlying token extraction should be corrected at the source design file so future extractions don't reintroduce the invalid pairing.

7.3 **`font.size.base` = 10px** is unusually small for primary body copy. Confirm whether this base applies to dense meta-text (tags/counts on 176 tiles) only, or is genuinely intended as default paragraph size — if the latter, flag against WCAG 2.2's general legibility guidance before locking it in as the base.

7.4 **`motion.duration.instant` = 300ms** is slow for "instant" naming; confirm intended use (see §2.4) before applying broadly to direct-manipulation feedback.

---

## 8. QA Checklist

- [ ] No raw hex/px values in shipped component code — all trace to §2 tokens
- [ ] Every `text.primary` usage sits on `surface.raised`; every `text.secondary` usage sits on `surface.base` (no exceptions)
- [ ] All 176 link instances (and any future additions) are grouped under landmarks with a skip link
- [ ] All 141 button instances have default/hover/focus-visible/active/disabled/loading/error states implemented per §3.2
- [ ] Focus outline visible and ≥3:1 contrast on every interactive element, verified by tabbing through the full page
- [ ] Touch targets ≥24×24px verified on the 3 inputs, all buttons, and all links via computed hit-area, not just visual size
- [ ] Table (§3.4) has working `aria-sort`, keyboard-operable headers, and an explicit empty/error/loading state
- [ ] Navigation (§3.5) collapses to an accessible disclosure pattern below breakpoint
- [ ] No color-only state signaling anywhere on the page (A6)
- [ ] All 8 spacing tokens are the only spacing values present in computed styles (spot-check via devtools)
- [ ] §7 verification items resolved or explicitly signed off as "as designed" by product/design before release
