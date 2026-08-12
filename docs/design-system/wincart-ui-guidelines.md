# Wincart — Content Surface UI Guidelines

## 1. Context and Goals

**Design intent:** render a card/link-dense listing surface (91 links, 73 cards on one view) as a flat, classic light theme — white page, subtly-toned cards — fully keyboard-operable and WCAG 2.2 AA compliant. (An earlier draft of this document read the raw tokens as a dark-shell design; overridden by product decision — see §2.2.)

- **Brand:** Wincart — [woodiewin.org/365](https://woodiewin.org/365/#)
- **Audience (as supplied):** readers and knowledge seekers
- **Product surface (as supplied):** content site
- **Confirmed brand context — contradicts the brief (must resolve before use):** live-site review of woodiewin.org shows an online sports-betting/casino platform (live cricket odds, betslip, game-category navigation, crash/slot/card games), not a content/reading site. The "content site / readers" classification is almost certainly a mis-extraction: a betting lobby's grid of 73 game/market cards, each carrying a link, is structurally identical to an article-listing grid to a naive extractor — same shape (card → title link → meta), different domain. Component guidance below is written for the **verified** surface (a betting/casino lobby), not the supplied label. If this token set is meant for a genuinely different, actually-text-heavy content site, re-verify before use — the two surfaces need different information density handling.
- **Secondary flag — reference-site legitimacy:** the fetched page carries no visible company registration, licensing, or regulatory-body credentials, despite operating real-money wagering. This has no bearing on the token values themselves, but if any business logic (not just visual tokens) is ever modeled on this reference, route it through compliance review first — this guide covers presentation only.
- **Known density:** 91 links, 73 cards, 40 buttons, 7 inputs, 4 lists, 2 navigation landmarks on one view. No table component appears in this density profile — omit table-specific guidance rather than inventing it.

---

## 2. Design Tokens and Foundations

Reference tokens by semantic name only. No raw hex/px in component guidance or implementation.

### 2.1 Typography

```css
--font-family-primary: system-ui;
--font-family-stack: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
  Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji",
  "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
--font-weight-base: 400;
--font-size-xs: 10.48px;
--font-size-sm: 12.58px;
--font-size-md: 13.1px;
--font-size-lg: 13.62px;
--font-size-xl: 14.67px;
--font-size-2xl: 16.77px;
--font-size-3xl: 18.86px;
--font-size-4xl: 20.96px;
--line-height-base: 15.72px; /* ≈1.5× font-size-xs */
```

- System font stack — no webfont loading, no FOUT/FOIT handling needed. Good fit for a link/card-dense page where first paint matters.
- Eight-step scale is tightly clustered (10.48–20.96px): `xs`–`lg` sit within 3px of each other and **must** be reserved for meta text (card eyebrows, odds/price labels, timestamps). Card titles and button labels **must** use `xl` or above so the primary action/heading is visually distinct from surrounding meta at this density.
- Scale line-height proportionally for sizes above `xs` (~1.4–1.5×); `line-height-base` (15.72px) is tuned for `xs` only.

### 2.2 Color

```css
--color-text-primary: #212529;
--color-text-secondary: #0d6efd;
--color-text-tertiary: #1b1b1b;
--color-border-strong: #ffffff;
--color-surface-base: #000000;
--color-surface-muted: #f2f2f2;
--color-surface-strong: #dddddd;
```

**Verified contrast (WCAG 2.2 AA: 4.5:1 normal text, 3:1 large text/UI components):**

| Pair | Ratio | AA normal | AA large/UI | Use |
|---|---|---|---|---|
| `text.primary` on `surface.base` | ~1.3:1 | Fail | Fail | **Never** |
| `text.primary` on `surface.muted` | 13.8:1 | Pass | Pass | Default body text on light cards |
| `text.primary` on `surface.strong` | 11.4:1 | Pass | Pass | Body text on strong-tone light surfaces |
| `text.tertiary` on `surface.base` | ~1.2:1 | Fail | Fail | **Never** |
| `text.tertiary` on `surface.muted` / `surface.strong` | 15.4:1 / 12.7:1 | Pass | Pass | Headings on light cards (slightly darker than `text.primary`) |
| `text.secondary` (link blue) on `surface.base` | 4.67:1 | Pass | Pass | Links/accents on the dark shell |
| `text.secondary` on `surface.muted` | 4.02:1 | **Fail** | Pass | Body-size links on light cards — **do not** use at `sm`/`md`; large text or `lg`+/bold only |
| `text.secondary` on `surface.strong` | 3.31:1 | **Fail** | Pass (borderline) | Same restriction as above, tighter margin |
| `border.strong` (white) on `surface.base` | 21:1 | — | Pass | Dividers/borders on the dark shell only |
| `border.strong` on `surface.muted`/`surface.strong` | ~1:1 | — | Fail | **Never** — invisible on light surfaces |

**Structural read of this palette, as extracted:** the raw tokens alone support a dark-shell reading — `surface.base` as page background, `surface.muted`/`surface.strong` as light cards floating on it — since that's the only way `text.primary`/`text.tertiary` (near-black) and `border.strong` (white) each have exactly one surface they work against.

**Product decision — overridden to a flat light theme.** The dark-shell reading above was this document's best inference from the tokens alone, not a requirement — the product owner confirmed a classic all-light theme instead, no dark surface anywhere. That changes the token mapping:

- `surface.base` (`#000000`) goes **unused** — there's nothing dark left for it to be the background of.
- The palette has no dedicated "page white" token either. `border.strong` (`#ffffff`) is repurposed as the page background (same gap-handling move as before, just aimed at a different hole) — still verified: `text.primary`/`text.tertiary` on `border.strong` inherits the same ~13–15:1 pass already shown for `surface.muted`/`surface.strong` in the table above, since white is even lighter.
- `text.secondary` (link blue) on this repurposed white background measures **exactly 4.5:1** — the AA line, not comfortably above it. Don't lighten the background any further, and keep the existing restriction: blue at body size still fails on `surface.muted`/`surface.strong` (4.02:1/3.31:1), so it's white-background-only, not "anywhere light."
- `surface.muted`/`surface.strong` remain in play as the **card** tone, subtly differentiated from the now-white page — the guidance below still applies to them unchanged, just without a dark page around them.

**Missing token (recurring — flag to design system owners):** as with the prior Chaska99 audit, this palette supplies no destructive/error/success color. Two consecutive extracted kits from real-money platforms have shipped with no state-color token despite transaction success/failure being core to the product — this is worth escalating as a pattern, not re-solving ad hoc each time.

**Derived, not supplied — border color.** `border.strong` used as a border is unusable against the light surfaces it now shares a page with (table above), and `surface.strong` directly against the white page measures ~1.36:1 (fails the 3:1 non-text minimum). A working border is `color-mix(in srgb, var(--color-text-tertiary) 50%, var(--color-border-strong))`, which computes to ~3.3:1 against the white page — clears the bar. (The card-on-card version of this problem — `surface.strong` against `surface.muted`, ~1.2:1 — still needs its own mix if borders appear inside a card; the same 50–55% `text.tertiary` approach clears it there too.) This is a derived workaround either way; verify the actual rendered contrast in devtools before shipping, and prefer a real token over the mix if one becomes available.

### 2.3 Spacing

```css
--space-1: 3px;      --space-2: 3.41px;   --space-3: 5.24px;   --space-4: 6.29px;
--space-5: 8.38px;   --space-6: 10.48px;  --space-7: 12.58px;  --space-8: 14.67px;
```

Closed scale, sub-pixel values preserved as-is (extracted, not rounded). No arbitrary spacing value outside these eight may appear in implementation.

### 2.4 Radius, Shadow, Motion

```css
--radius-xs: 2.62px;   --radius-sm: 5.24px;   --radius-md: 6.29px;  --radius-lg: 8px;
--radius-xl: 8.38px;   --radius-2xl: 10.48px; --radius-step7: 12px; --radius-step8: 27.25px;

--shadow-1: rgba(0,0,0,0.1) 0px 3.144px 10.48px 0px;
--shadow-2: rgba(0,0,0,0.1) 0px 2px 8px 0px;
--shadow-3: rgba(0,0,0,0.05) 0px 3.144px 8.384px 0px;
--shadow-4: rgba(0,0,0,0.05) 0px 4px 30px 0px;

--motion-instant: 150ms;  --motion-fast: 200ms;   --motion-normal: 250ms;
--motion-slow: 300ms;     --motion-slower: 400ms; --motion-step6: 600ms;
```

- `radius-step7`/`step8` are unlabeled extraction artifacts (12px, 27.25px) — `step8` (27.25px) is large enough to read as a pill/badge radius; reserve it the same way Chaska99's `radius.lg` was reserved — badges and fully-rounded controls only, never a card's own corner radius. Cards (73 of them) should use `radius-lg`/`radius-xl` (8–8.38px), consistent with `shadow-1`/`shadow-2` which read as card-elevation shadows at that size.
- `shadow-3`/`shadow-4` (lower opacity, larger blur) read as hover/raised-state or overlay shadows rather than resting-card shadows — assign by elevation, not arbitrarily.
- Six motion steps give real range: `instant` (150ms) for hover/press feedback, `fast`/`normal` (200–250ms) for card hover-lift and dropdown open, `slow`/`slower` (300–400ms) for larger transitions (modal, drawer), `step6` (600ms) for anything animating a large area (carousel slide, page transition) — do not use `step6` for direct-manipulation feedback, it will read as laggy.

---

## 3. Component Rules

Ordered by density: Link, Card, Button, Input, List, Navigation.

### 3.1 Link (91/page)

**Anatomy:** text label + optional leading/trailing icon. Predominantly card titles and inline meta links (odds, "View all", footer).

**States:**

| State | Spec |
|---|---|
| Default | On page: `text.secondary` at large/bold size only (4.5:1 on the white page, exactly the AA line — see §2.2). On card: `text.primary`/`text.tertiary`, underlined only if used inline in body copy — standalone card-title links don't need underline if the whole card is clickable (§3.2) |
| Hover | Underline (if not present) + `motion.instant`; color alone is not a sufficient hover signal per §4 A6 |
| Focus-visible | 2px outline, offset ≥2px, using `text.tertiary` — works against both the white page and the light card background (unlike `border.strong`, which is now the page fill, not a usable outline color) |
| Active | No added transition delay |
| Disabled | Convert to plain text or remove — links don't have a disabled state |
| Loading | N/A — async navigation shows a page-level indicator, not a per-link one |
| Error | Broken links are removed before ship, not styled |

**Keyboard/pointer/touch:** standard `<a>` semantics, `Enter` activates, natural tab order, ≥24×24px effective hit area.

**Responsive/edge cases:**
- Truncate long titles to 1–2 lines with `text-overflow: ellipsis`; keep the untruncated text as the accessible name.
- **Density edge case (must):** 91 links on one view **must** be grouped — every link lives inside a card (§3.2) or a labeled list/nav region, never loose in an unlabeled flat DOM. This is what makes 91 links navigable by keyboard/screen-reader instead of a wall of tab stops.

---

### 3.2 Card (73/page)

**Anatomy:** container (`surface.muted`/`surface.strong` background, `radius.lg`–`xl`, `shadow.1`/`.2`) holding a title link, meta text, and typically one primary button.

**Variants:** standard (game/market card) · compact (odds chip inside a card) · featured (promotional card, larger radius/shadow — still not `radius.step8`, which is reserved for pills).

**States:**

| State | Spec |
|---|---|
| Default | `surface.muted` bg, `text.primary` body / `text.tertiary` heading, derived border from §2.2, `shadow.1` |
| Hover | If the whole card is a single interactive target, lift with `shadow.2`→`shadow.3` swap over `motion.fast`; add a visible border/outline change too, not shadow alone, since shadow changes can be too subtle to count as a real state signal on their own |
| Focus-visible | If the card itself is focusable (i.e., the whole card is the click target, not just an inner link), a 2px `text.tertiary` outline around the full card boundary — never focus-style only the inner title link while leaving a click-anywhere card silently unfocusable |
| Active/pressed | No added transition delay |
| Disabled | Reduced opacity, `aria-disabled`, non-interactive; state must still be legible (don't drop below ~60% opacity or the derived border disappears entirely) |
| Loading | Skeleton block matching the card's own dimensions (not a spinner overlay) — with 73 cards on a view, a full-page spinner blocking all of them on any single slow fetch is a worse experience than per-card skeletons |
| Error | Inline message inside the card's own bounds ("Unavailable — try again"), card remains its normal size so the grid doesn't reflow |

**Keyboard/pointer/touch:** if the whole card navigates (common at this density), implement it as a single `<a>`/`Link` wrapping the card, not a `<div onClick>` — this gets keyboard/touch/middle-click/right-click-to-open-in-new-tab for free. If a card also has a secondary button inside (e.g., title links to a detail page, button does something else), the button **must** stop propagation so the two targets don't fire together, and both **must** be independently reachable by `Tab`.

**Responsive/edge cases:**
- Grid reflows by available width, not a fixed column count; cards **must not** get narrower than the point where title truncation starts hiding meaningfully different titles.
- **Empty state (must):** a card grid with zero results renders one explicit empty-state message spanning the grid area, never zero cards with no explanation.
- **Density edge case (must):** with 73 cards, group them under labeled sections (matching the Link rule in §3.1) so keyboard users can skip between card groups instead of tabbing through all 73 sequentially.

---

### 3.3 Button (40/page)

**Anatomy:** label (verb-first) + optional icon. Mostly the primary action inside a card (e.g., "Bet Now", "Play"), plus nav-level actions (login/signup).

**States:**

| State | Spec |
|---|---|
| Default | Primary: bg `text.secondary` (blue), text `border.strong` (white) — verified 4.5:1, exactly at the AA line, so **do not** darken/tint this pairing casually, it's already calibrated. Secondary: bg `surface.strong`, text `text.tertiary`, border from the derived card-border mix |
| Hover | No lighter/darker in-palette tone for primary — signal via `shadow.2` addition or a thin `border`-derived ring, not an invented tint |
| Focus-visible | 2px outline offset ≥2px, using `text.tertiary` — a `border.strong` (white) outline would be invisible against the white page it now sits on (only worked in the earlier dark-shell reading) |
| Active/pressed | Instant, no transition delay |
| Disabled | Opacity reduced but boundary must stay ≥3:1 against its surface; `aria-disabled`, keep focusable with a reason unless truly inert |
| Loading | Spinner **plus** accessible text (`aria-busy="true"`, visually-hidden label retained) — never spinner-only; disable to prevent double-submit |
| Error | Return focus to the button, show the error adjacent, reset label — don't strand it on "Loading" |

**Keyboard/pointer/touch:** `Enter`/`Space` activate, ≥24×24px touch target enforced via `space` tokens even at this density (40 buttons/page invites over-cramming).

**Responsive/edge cases:** wrap label to a second line rather than truncate a CTA; a disabled "Bet Now" on a suspended market must say why inline, not just grey out.

---

### 3.4 Input (7/page)

**Anatomy:** always-visible label + control + optional helper/error text. At 7/page these are high-stakes (login, stake/wager amount, search) — validate on blur at minimum, not only on submit.

**States:** default / hover / focus-visible (2px outline, `text.secondary` or `text.tertiary` depending on surrounding surface per §2.2) / active / disabled (dim control only, label stays full-strength) / loading (inline spinner, e.g. async username availability check) / error (icon + text — no error-red token exists in this palette either, so color alone **must not** carry the error signal; see missing-token note in §2.2).

**Keyboard/pointer/touch:** standard text-input behavior, `label[for]`/`id` association mandatory, error text linked via `aria-describedby`.

**Responsive/edge cases:** a wager/stake input specifically must reject non-numeric input at the input level (not just on submit) and show min/max constraints inline, not only after a failed submit — this is a financial-input rule, not a generic form rule.

---

### 3.5 List (4/page)

**Anatomy:** semantic `<ul>`/`<ol>` — likely category filters, footer link groups, or a betslip line-item list.

**States:** default / hover+focus-visible (interactive items only) / empty (explicit "No items" message, not a bare empty `<ul>`).

**Responsive/edge cases:** a betslip-style list (if present) must announce additions/removals to assistive tech (`aria-live="polite"` region), since it's the kind of dynamic list where a sighted user sees an item appear but a screen-reader user gets nothing unless it's announced.

---

### 3.6 Navigation (2/page)

**Anatomy:** two distinct `<nav>` landmarks — read as a primary top-level nav plus a secondary category/filter nav (e.g., sport or game-type tabs).

**States:** default item / hover / focus-visible / current (`aria-current="page"` or `"true"` for a tab-style secondary nav) / disabled (gated section, shown with a reason, not hidden).

**Keyboard/pointer/touch:** full `Tab`/`Shift+Tab` traversal; if the secondary nav is tab-like (category switcher), arrow-key movement between tabs with `Tab` only entering/leaving the tablist, per standard tabs pattern.

**Responsive/edge cases:**
- **Accessible-name rule (must):** with two `<nav>` landmarks on one page, each **must** have a distinct `aria-label` (e.g., "Primary", "Categories") — two unlabeled/identically-labeled nav landmarks are indistinguishable to screen-reader users navigating by landmark.
- Primary nav collapses to a disclosure pattern below the dashboard's breakpoint with `aria-expanded` on the trigger; secondary/category nav becomes horizontally scrollable with a visible scroll affordance rather than collapsing into a hidden menu, since users typically want it visible while browsing cards.

---

## 4. Accessibility Requirements — Testable Acceptance Criteria

| # | Rule | Pass condition | Fail condition |
|---|---|---|---|
| A1 | Text/surface pairing | Every text node resolves to a passing pair in §2.2's table | `text.primary`/`text.tertiary` on `surface.base`, or `border.strong` on a light surface |
| A2 | Link-blue restriction | `text.secondary` at `sm`/`md` size never appears on `surface.muted`/`surface.strong` | Body-size blue link text rendered on a light card (4.02:1/3.31:1, both fail normal-text AA) |
| A3 | Focus visibility | Every interactive element (91 links + 73 cards where card-level focusable + 40 buttons + 7 inputs + nav items) shows a ≥2px, ≥3:1-contrast outline on keyboard focus | Any `outline: none` with no replacement |
| A4 | Landmark grouping | Links and cards are grouped under labeled sections; both `<nav>` landmarks have distinct accessible names | >20 ungrouped links/cards, or two unlabeled/same-labeled nav regions |
| A5 | Touch target size | Every interactive control ≥24×24px effective hit area | Any measurably smaller with no padding compensation |
| A6 | No color-only signaling | Hover/error/current states pair a non-color cue with any color change | Any state distinguishable by color alone |
| A7 | Card click-target integrity | Click-anywhere cards are real `<a>`/`Link` elements; nested interactive elements stop propagation and remain independently tabbable | `<div onClick>` cards, or a card+button combo that double-fires or traps focus |
| A8 | Loading accessibility | Every async button/input/card exposes an accessible loading state (`aria-busy` or equivalent text) | Spinner-only with no text alternative |
| A9 | Empty states | Every list/card-grid has an explicit, styled empty-state message | Blank container, no message |

---

## 5. Content and Tone Standards

Concise, confident, implementation-focused — same standard as the rest of this system.

- **Do:** "Bet Now", "Add funds", "No matches found", "Stake must be between ₹10–₹50,000."
- **Don't:** "Click here", "Learn more" with no context, "Something went wrong" with no next step, "Submit" on a wager confirmation (name the action).
- With 40 "Bet Now"/"Play"-style buttons possibly repeating verbatim across a page, the **accessible name** must disambiguate (e.g., visually "Bet Now", accessible name "Bet Now — India vs Australia, Match Winner") — same rule as Chaska99's link-density guidance, and just as necessary here given the button count.

---

## 6. Anti-Patterns and Prohibited Implementations

- **Do not** reintroduce `surface.base` as a background anywhere — the theme is flat light by product decision (§2.2); it has no role now.
- **Do not** use `text.secondary` (link blue) at body text size on `surface.muted`/`surface.strong` cards — only on the white page background, and only at large/bold size on cards.
- **Do not** hardcode hex/px values; trace everything to §2.
- **Do not** invent a hover tint via `filter`/ad hoc `rgba` overlays — use the shadow-step or outline signals specified per component.
- **Do not** implement click-anywhere cards as non-semantic `<div>`s.
- **Do not** use `radius.step8` (27.25px) on card corners — it's a pill/badge radius.
- **Do not** ship two `<nav>` landmarks without distinct `aria-label`s.
- **Do not** treat this token set as validated for an actual text-heavy content site without re-confirming — it was extracted from a betting lobby (§1).

---

## 7. Verification Items (resolve before shipping)

7.1 **Surface/audience mismatch.** The brief says "content site / readers and knowledge seekers"; the live page is a sports-betting and casino platform. Component guidance here follows the verified surface. If this token set is actually meant for a different, genuinely text-heavy property, re-derive the density profile and component set — a content site would show far more List/Table and far fewer Card/Button instances than 73/40.

7.2 **No dedicated "page white" token.** The palette gives two on-light text colors (`text.primary`/`text.tertiary`) and two light card tones (`surface.muted`/`surface.strong`), but nothing for the page background itself now that the theme is flat light. This guide reuses `border.strong` (white) for that purpose (§2.2) — get a dedicated token from the source design file so a border color isn't doing double duty. (Resolved differently than the first draft of this note, which reused it for dark-shell text instead — same underlying gap, different hole.)

7.3 **No destructive/success color**, same gap flagged in the Chaska99 audit — now seen twice across two extracted kits from real-money platforms. Recommend raising this at the token-source level rather than re-deriving a workaround per project.

7.4 **Derived card border is a computed workaround**, not a supplied value (§2.2). Verify actual rendered contrast in devtools; replace with a real token if the source design system adds one.

7.5 **Reference-site compliance gap** (§1): no licensing/registration info visible on the reference page. Irrelevant to these visual tokens, but flag before any business/compliance logic (not covered by this document) is ever modeled on the same reference.

---

## 8. QA Checklist

- [ ] No raw hex/px values in shipped code — all trace to §2 tokens
- [ ] `text.primary`/`text.tertiary` only appear on `surface.muted`/`surface.strong`; `border.strong` only appears on `surface.base`
- [ ] `text.secondary` at body size never appears on a light card — spot-check every card's CTA/link color
- [ ] All 91 links and 73 cards are grouped under labeled sections — no loose top-level links/cards
- [ ] Both `<nav>` landmarks have distinct, descriptive `aria-label`s
- [ ] Every card that's a single click target is a real anchor/Link, not a `div onClick`
- [ ] Focus outline visible and ≥3:1 contrast on every interactive element, verified by tabbing the full page
- [ ] Touch targets ≥24×24px verified on all 40 buttons and 7 inputs
- [ ] Every button/card loading state has a text alternative, not a bare spinner
- [ ] Card grid and all 4 lists have explicit empty-state messages
- [ ] All spacing/radius/shadow/motion values present in computed styles trace to §2 (spot-check via devtools)
- [ ] §7 verification items resolved or explicitly signed off as "as designed" before release
