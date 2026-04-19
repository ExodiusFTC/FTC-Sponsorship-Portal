# Matchmaker Frontend Revamp — Resend Design System

**Executor:** Gemini Flash (full codebase access)
**Reviewer:** Anish
**Risk Level:** HIGH — This is a full visual layer replacement. Preserve all logic, routing, auth, and data fetching. Touch only styles, markup structure, and component composition.

> **CRITICAL EXECUTION RULE:** Do **NOT** execute this plan directly. This document is the authoritative specification. Read it end-to-end before writing a single line of code. Every ambiguity must be resolved against this file, not by improvisation. If two sections appear to conflict, the later phase wins, but flag the conflict in your output.

---

## Table of Contents

1. [Stack Answers (Pre-Resolved)](#1-stack-answers-pre-resolved)
2. [Pre-Flight Audit](#2-pre-flight-audit)
3. [Global Design System](#3-global-design-system)
4. [Phase 0 — Fonts & CSS Foundation](#phase-0--fonts--css-foundation)
5. [Phase 1 — Theme Provider](#phase-1--theme-provider)
6. [Phase 2 — Sidebar Component](#phase-2--sidebar-component)
7. [Phase 3 — App Layout Shell](#phase-3--app-layout-shell)
8. [Phase 4 — Core UI Primitives](#phase-4--core-ui-primitives)
9. [Phase 5 — Page Header Pattern](#phase-5--page-header-pattern)
10. [Phase 6 — Screen Refreshes](#phase-6--screen-refreshes)
11. [Phase 7 — Final Polish & Consistency Pass](#phase-7--final-polish--consistency-pass)
12. [Micro-Interaction Reference](#micro-interaction-reference)
13. [Hard Constraints — What Gemini MUST NOT Do](#hard-constraints--what-gemini-must-not-do)
14. [Deliverables & Handoff](#deliverables--handoff)

---

## 1. Stack Answers (Pre-Resolved)

These answers are **final** — do not re-litigate them during implementation.

| # | Question | Answer | Rationale |
|---|----------|--------|-----------|
| 1 | App Router or Pages Router? | **App Router** | Resend uses Next.js 15 with React Server Components as the primary data-fetching pattern. The existing project is on Next.js 16.2 App Router per `CLAUDE.md`. |
| 2 | Tailwind or raw CSS? | **Tailwind CSS (v4)** | Resend builds custom components using Tailwind and Radix Primitives. Extend tokens in `tailwind.config.ts` — do not write raw CSS vars inside Tailwind-managed files. |
| 3 | Existing shadcn/ui? | **Use Radix Primitives directly — no shadcn opinions** | Resend builds on top of Radix UI and Tailwind, not shadcn's opinionated wrappers. If shadcn is already present, strip the default theme and treat it as a bare Radix wrapper only. |
| 4 | Framer Motion installed? | **No — pure CSS animations only** | Resend's animations are pure CSS keyframes and transitions. Use Tailwind utility classes (`duration-200`, `ease-out`) and `@keyframes`. No JS animation library is permitted. |
| 5 | Existing role detection? | **Supabase Auth with custom organization model** | Resend uses Supabase for authentication. Role detection reads from the Supabase session via `useUser()` or equivalent hook, branching on `user.user_metadata.role`. Sidebar conditional rendering **must** consume this hook — never hardcode roles. |
| 6 | Admin badge count — real-time or static? | **SWR polling @ 30s intervals** | Resend uses SWR on routes not yet migrated to RSC. Implement `useSWR('/api/admin/queue/count', { refreshInterval: 30000 })`. No websocket needed at this scale. |

---

## 2. Pre-Flight Audit

**Before writing a single line of code, Gemini must internally answer all 7 questions below by scanning the codebase. Do not proceed past this section until all are resolved.** Document the answers in the PR description.

1. **Router type:** Confirm this is Next.js App Router. Determines where `layout.tsx` lives and how fonts load. Expected answer: App Router.
2. **Tailwind:** Confirm Tailwind CSS is in use. If yes, extend `tailwind.config.ts` with tokens instead of raw CSS vars in globals. Expected answer: Yes, Tailwind v4.
3. **shadcn/ui:** Is shadcn/ui already installed? If yes, update `components.json` theme — do not re-install. Use as a bare Radix wrapper only.
4. **Auth library:** Expected answer: Supabase Auth. The user row in the sidebar must pull from the existing Supabase session hook, not hardcode anything.
5. **Role routing:** What is the current routing structure for the three roles (Coach, Admin, Sponsor)? Sidebar must conditionally render based on existing role detection, not rebuild it.
6. **Theme provider:** Does one already exist? If yes, extend it — do not create a conflicting one.
7. **Animation libraries:** Expected answer: None. Use pure CSS keyframes and Tailwind transition utilities throughout.

**Deliverable from this phase:** A short "preflight.md" or PR-description section stating the file paths where each of the above was confirmed.

---

## 3. Global Design System

### 3.1 Theming

| Property | Value |
|----------|-------|
| Toggle key | `M` |
| LocalStorage key | `mm-theme` |
| Default | `dark` |
| Attribute | `data-theme="light"` or `data-theme="dark"` on `<html>` |
| Transition | `background 200ms ease, color 200ms ease` on `body` |
| Flash prevention | Inline script in `<head>` (see Phase 1) |

### 3.2 Color Tokens

#### Light Theme
```
--bg-app: #FFFFFF
--bg-surface: #FAFAFA
--bg-elevated: #F4F4F5
--bg-hover: #F4F4F5
--border: #E4E4E7
--text-primary: #09090B
--text-secondary: #71717A
--text-muted: #A1A1AA
--accent-error: #ff1717ff
--badge-success-bg: #F0FDF4
--badge-success-text: #166534
--badge-pending-bg: #FAFAF9
--badge-pending-text: #78716C
--badge-warning-bg: #FFFBEB
--badge-warning-text: #92400E
--badge-rejected-bg: #FFF1F2
--badge-rejected-text: #9F1239
```

#### Dark Theme
```
--bg-app: #000000
--bg-surface: #09090B
--bg-elevated: #111111
--bg-hover: #1A1A1A
--border: #27272A
--text-primary: #FFFFFF
--text-secondary: #A1A1AA
--text-muted: #52525B
--accent-error: #7F1D1D
--badge-success-bg: #14532D
--badge-success-text: #86EFAC
--badge-pending-bg: #1C1917
--badge-pending-text: #A8A29E
--badge-warning-bg: #1C1400
--badge-warning-text: #FCD34D
--badge-rejected-bg: #1C0A0A
--badge-rejected-text: #FCA5A5
```

### 3.3 Typography

**Fonts**
- Primary sans: **Inter** (Google Fonts; weights 400/500/600)
- Mono: **JetBrains Mono** (Google Fonts; weights 400/500)
- Fallback sans: `system-ui, -apple-system, sans-serif`
- Fallback mono: `"Courier New", monospace`

**Scale**

| Style | Spec |
|-------|------|
| H1 Page Title | `font-size: 20px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.3px` |
| H2 Card Title | `font-size: 15px; font-weight: 500; color: var(--text-primary)` |
| Body | `font-size: 14px; font-weight: 400; color: var(--text-secondary); line-height: 1.5` |
| Caption / Table Header | `font-size: 12px; font-weight: 500; color: var(--text-muted); letter-spacing: 0.02em; text-transform: uppercase` |
| Code / Team Numbers | `font-family: var(--font-mono); font-size: 12px` |

### 3.4 Spacing

| Level | Values | Use |
|-------|--------|-----|
| Micro | 4px, 8px | Icon-to-text, tight stacks |
| Component | 12px, 16px | Button padding, list items |
| Section | 24px, 32px | Between cards, header → content |
| Page | 48px, 64px | Page margins |

### 3.5 Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | Small chips |
| `--radius-md` | 6px | Inputs, cards, buttons |
| `--radius-lg` | 10px | Modals |
| `--radius-full` | 9999px | Badges, pills |

---

## Phase 0 — Fonts & CSS Foundation ✅ DONE (2026-04-18)

**File Action:** MODIFY `app/globals.css`

### Instructions
1. Add Google Fonts import at the very top of the file: Inter (400/500/600) and JetBrains Mono (400/500).
2. Define all CSS custom properties on:
   - `:root` → light theme values
   - `[data-theme="dark"]` → dark theme values
3. Use every token listed in §3.2.
4. Body base styles:
   - `font-family: var(--font-sans)`
   - `font-size: 14px`
   - `background: var(--bg-app)`
   - `color: var(--text-primary)`
   - `-webkit-font-smoothing: antialiased`
   - `transition: background 200ms ease, color 200ms ease`
5. Apply universal `box-sizing: border-box`.

### Tailwind Integration Note
If Tailwind is confirmed (expected: yes), add all tokens to `tailwind.config.ts` under `extend.colors` and `extend.fontFamily` using **semantic names** (`bg-app`, `surface`, `border-default`, etc.). Do **not** write raw CSS vars inside Tailwind-managed files — let the config resolve them so Tailwind's purge and autocomplete keep working.

For Tailwind v4 (which uses `@theme` directive in CSS), declare tokens in the `@theme` block in `globals.css` so utilities auto-generate. Confirm the project's Tailwind version first.

---

## Phase 1 — Theme Provider ✅ DONE (2026-04-18)

**File Action:** CREATE `components/theme-provider.tsx`

### Implementation
- Mark the file as `'use client'`.
- Create `ThemeContext` with shape: `{ theme: 'light' | 'dark'; toggle: () => void }`.
- On mount:
  1. Read `'mm-theme'` from `localStorage`, default to `'dark'`.
  2. Set state to the resolved value.
  3. `document.documentElement.setAttribute('data-theme', resolved)`.
- **`M` key listener:**
  - Attach to `window.keydown`.
  - **Guard:** if `event.target.tagName` is `INPUT`, `TEXTAREA`, or `SELECT`, **return early** and do not fire toggle.
  - Remove listener on unmount.
- `toggle()`:
  1. Flip theme state.
  2. Write new value to `localStorage` under key `'mm-theme'`.
  3. `setAttribute('data-theme', next)` on `document.documentElement`.
- Export `useTheme()` hook that **throws** if used outside provider.

### Flash Prevention
Add an inline `<script>` tag to the `<head>` in `app/layout.tsx` that runs synchronously before hydration:

```js
try {
  var t = localStorage.getItem('mm-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
```

Use `dangerouslySetInnerHTML`. This **must** be the first child of `<head>`.

---

## Phase 2 — Sidebar Component ✅ DONE (2026-04-18)

**File Action:** CREATE `components/sidebar.tsx`

### 2a. NavItem Atom

**Props:** `icon: LucideIcon`, `label: string`, `href: string`, `badge?: number`, `isActive: boolean`

**Structure:**
`Link` wrapper → flex row → animated icon container → label text → optional badge

**Icon Animation**
- On click *and* on active mount: toggle a CSS class that applies:
  - `animation: navPop 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;`
- Keyframes: `@keyframes navPop { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }`
- Implementation: pure CSS class toggle — no JS animation library.
- On hover: icon `scale(1.1)` 150ms ease-out via CSS transition on the icon element.

**States**
| State | Styles |
|-------|--------|
| Active | `background: var(--bg-hover); icon color: var(--text-primary); label color: var(--text-primary); font-weight: 500` |
| Inactive | `background: transparent; icon color: var(--text-muted); label color: var(--text-secondary)` |
| Hover | `background: var(--bg-elevated); icon & label shift toward var(--text-primary); transition: background 100ms ease` |

**Item layout**
`display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 6px; cursor: pointer; transition: background 100ms ease`

### 2b. Logo Block
- Icon: geometric SVG (two overlapping hexagons or a diamond), `18x18px`, `currentColor`.
- Hover: container `transform: scale(1.05)` over 150ms ease-out.
- Wordmark: **Matchmaker** — `font-size: 14px; font-weight: 600; color: var(--text-primary)`.

### 2c. Role-Based Nav Items

**Data source:** Supabase `useUser()` hook — read `user.user_metadata.role`. Do not hardcode.

**Coach**
| Icon | Label |
|------|-------|
| `LayoutDashboard` | Overview |
| `FileText` | My Application |
| `Target` | Find Sponsors |
| `Clock` | Pitch History |
| `Settings` | Settings |

**Admin**
| Icon | Label | Badge |
|------|-------|-------|
| `LayoutDashboard` | Dashboard | — |
| `Inbox` | Review Queue | ✅ `useSWR('/api/admin/queue/count', { refreshInterval: 30000 })` |
| `Building2` | Sponsors | — |
| `Users` | Teams | — |
| `BarChart2` | Analytics | — |

### 2d. Bottom Section
- **Divider:** `1px solid var(--border)` above this section.
- **Theme Toggle:**
  - 32×32px icon button. `border-radius: 6px`. Hover: `background: var(--bg-elevated)`.
  - Show `Sun` icon in dark mode, `Moon` icon in light mode.
  - Click calls `toggle()` from `useTheme()`.
  - Icon transition: `opacity 0→1` + `rotate(30deg → 0deg)` over 200ms ease-out using CSS transition on `.icon-enter` class.
  - No label text.
- **User Row:**
  - Avatar: 26px circle, `background: var(--bg-elevated)`, `border-radius: 50%`, initials text `11px`, `font-weight: 600`.
  - Name: pulled from Supabase session, `font-size: 14px`, `color: var(--text-primary)`.
  - `ChevronDown` icon: 14px, `color: var(--text-muted)`.
  - Click: opens absolute-positioned dropdown.
    - `background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 4px; min-width: 160px`.
  - Close on outside click via `useEffect` `mousedown` listener.
  - Dropdown items: `Sign Out`, `Settings` link.

### 2e. Review Queue Badge
- **Position:** inline, right-aligned using `margin-left: auto` on the badge span.
- **Styles:** `background: var(--bg-elevated); color: var(--text-primary); font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 9999px; border: 1px solid var(--border)`.
- **Pulse animation:** When the SWR count value changes, toggle a CSS class for `animation: badgePulse 300ms ease-out`.
  - Keyframes: `@keyframes badgePulse { 0% { transform: scale(1); } 50% { transform: scale(1.35); } 100% { transform: scale(1); } }`
  - Use `useEffect` to detect value change via a ref comparison — **not** on every render.

### 2f. Sidebar Shell
| Property | Value |
|----------|-------|
| Width | `240px` fixed |
| Border | `border-right: 1px solid var(--border)` |
| Layout | `display: flex; flex-direction: column; justify-content: space-between; padding: 16px 12px; height: 100vh; position: fixed; top: 0; left: 0; background: var(--bg-app)` |
| Nav gap | `gap: 2px` between items |

---

## Phase 3 — App Layout Shell ✅ DONE (2026-04-18)

**File Action:** CREATE `components/app-layout.tsx`

### Instructions
- **Outer container:** `display: flex; flex-direction: row; height: 100vh; overflow: hidden; background: var(--bg-app)`.
- **Sidebar:** rendered fixed at left, 240px wide (from Phase 2).
- **Main:** `flex: 1; overflow-y: auto; padding: 40px 48px; margin-left: 240px`.
- **Inner content wrapper:** `max-width: 1100px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 32px`.

### Integration
Replace the existing top-nav layout wrapper in `app/layout.tsx` (or per-role route group `layout.tsx` files) with `AppLayout`.

### Exception
The **Sponsor view page** does **NOT** use `AppLayout`. It has its own standalone layout with no sidebar (see Phase 6f).

---

## Phase 4 — Core UI Primitives ✅ DONE (2026-04-18)

**Rule:** Preserve all existing props APIs. Only update visual output. Do not break existing consumers. Extend variant lists — do not replace them.

### 4a. Button — MODIFY `components/ui/button.tsx`

| Variant | Styles |
|---------|--------|
| `primary` | `background: var(--text-primary); color: var(--bg-app); border: none; padding: 7px 14px; border-radius: 6px; font-size: 14px; font-weight: 500; transition: opacity 150ms ease.` Hover: `opacity: 0.85`. |
| `secondary` | `background: transparent; color: var(--text-primary); border: 1px solid var(--border);` same padding/radius. Hover: `background: var(--bg-elevated)` over 100ms ease. |
| `destructive` | `background: transparent; color: var(--accent-error); border: 1px solid var(--accent-error);` same padding/radius. |
| `icon` | 32×32px; `border-radius: 6px`; centered 16px icon; hover `background: var(--bg-elevated)`. |

**Tactile feedback:** `active:scale-[0.98]` via Tailwind OR `onMouseDown/Up` handlers. Duration 80ms.

### 4b. Badge — MODIFY `components/ui/badge.tsx`

**Dot prefix:** 6px circle span, `border-radius: 50%`, `background: currentColor`, `display: inline-block`, `margin-right: 5px`.

**Statuses**
| Status | Background token | Text token |
|--------|------------------|------------|
| `approved` | `--badge-success-bg` | `--badge-success-text` |
| `pending` | `--badge-pending-bg` | `--badge-pending-text` |
| `needs-revision` | `--badge-warning-bg` | `--badge-warning-text` |
| `rejected` | `--badge-rejected-bg` | `--badge-rejected-text` |
| `draft` | `--badge-pending-bg` | `--badge-pending-text` |
| `locked` | `--bg-elevated` | `--text-muted` |

**Base styles:** `display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; border: 1px solid (color-matched)`.

### 4c. Card — MODIFY `components/ui/card.tsx`

- **Base:** `background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 20px 24px`.
- **Empty variant (`CardEmpty`):** centered flex column; `min-height: 200px`; icon 32px `color: var(--text-muted)`; title `margin-top: 12px`; subtitle `max-width: 320px; text-align: center; margin: 0 auto`; CTA button `margin-top: 16px`.

### 4d. Table — MODIFY `components/ui/table.tsx`

- **Header:** `font-size: 12px; text-transform: uppercase; letter-spacing: 0.02em; color: var(--text-muted); font-weight: 500; border-bottom: 1px solid var(--border)`.
- **Row:** `height: 44px; border-bottom: 1px solid var(--border); transition: background 100ms linear`. Hover: `background: var(--bg-hover)`.
- **First col:** `color: var(--text-primary); font-weight: 500`.
- **Other cols:** `color: var(--text-secondary)`.
- **MonoChip utility component:** `font-family: var(--font-mono); font-size: 12px; background: var(--bg-elevated); padding: 2px 6px; border-radius: 4px` — used for team numbers and IDs.
- **Pagination:** right-aligned row below table; secondary text color; Prev/Next as secondary button style.

### 4e. Input / Textarea / Select

- **Base:** `background: var(--bg-app); border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; font-size: 14px; color: var(--text-primary); transition: border-color 100ms ease; outline: none`.
- **Placeholder:** `color: var(--text-muted)`.
- **Focus:** `border-color: var(--text-secondary)`.
- **Error:** `border-color: var(--accent-error)` — **NO transition, snap instantly to red**.
- **Form group:** `display: flex; flex-direction: column; gap: 6px`.
  - Label: `font-size: 13px; font-weight: 500; color: var(--text-primary)`.
  - Error message: `font-size: 12px; color: var(--accent-error); margin-top: 4px`.

### 4f. Modal

- **Overlay:** `position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(2px); z-index: 50`.
- **Container:** `background: var(--bg-app); border: 1px solid var(--border); border-radius: 10px; padding: 24px; width: 480px; max-width: 90vw; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`.
- **Entrance animation:**
  - `@keyframes modalIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }`
  - Applied once on mount. Duration `200ms ease-out`. **No exit animation.**
- **Header:** flex row — title `H2` left, `X` icon button right-aligned.
- **Footer:** right-aligned flex row; `gap: 8px`; secondary `Cancel` button + primary `Confirm` button.
- **Admin edit variant:** textarea input for message, full-width, `min-height: 100px`, styled with Phase 4e input styles.

### 4g. Tab — CREATE_OR_EXTEND `components/ui/tabs.tsx`

- **Layout:** horizontal flex; `gap: 4px`.
- **Active:** `background: var(--bg-elevated); color: var(--text-primary); font-weight: 500; border-radius: 6px; padding: 6px 12px`.
- **Inactive:** `color: var(--text-secondary); background: transparent`. Hover: `background: var(--bg-elevated)` at reduced opacity over 100ms.
- **Content switch:** **zero transition** on content swap — instant. Only the active pill background transitions.

---

## Phase 5 — Page Header Pattern ✅ DONE (2026-04-18)

**File Action:** CREATE `components/page-header.tsx`

### Props
- `title: string`
- `subtitle?: string`
- `action?: ReactNode`
- `tabs?: { label: string; value: string }[]`
- `activeTab?: string`
- `onTabChange?: (value: string) => void`

### Structure
1. Outer div → flex row between title block and action slot.
2. Title block: `H1` title + optional subtitle paragraph (`color: var(--text-secondary); margin-top: 4px`).
3. Action slot: right-aligned `ReactNode`.
4. Optional `TabBar` below — renders the Tab component from Phase 4g.
5. Divider: `hr; border: none; border-top: 1px solid var(--border); margin-top: 16px`.

### Integration
Replace **ALL** existing page title sections across every screen with this component.

---

## Phase 6 — Screen Refreshes ✅ DONE (2026-04-18)

**Rule:** Do not rewrite data fetching, form submission handlers, validation logic, or API calls. Only restructure JSX and replace style props and classNames.

### 6a. Admin Dashboard
- **Layout:** wrap in `AppLayout`. `PageHeader` with title `"Dashboard"`.
- **Metrics row:** 4-column CSS grid; `gap: 16px`. Each card:
  - Label in caption style.
  - Large number: `font-size: 28px; font-weight: 600; letter-spacing: -0.5px; color: var(--text-primary)`.
  - Optional small sparkline SVG (`var(--text-muted)` stroke, no fill, 40px tall).
- **Recent Matches:** full-width table using updated Table component from Phase 4d.

### 6b. Admin Review Queue
- **Layout:** two-panel split: `display: grid; grid-template-columns: 35% 65%; gap: 0; height: 100%; overflow: hidden`. Each panel: `overflow-y: auto`.
- **Left panel — Pending submission list:**
  - Each row: `MonoChip` team number + company name + relative timestamp (`font-size: 12px; color: var(--text-muted)`).
  - Active row: `background: var(--bg-elevated)`.
  - `border-bottom: 1px solid var(--border)` between rows.
- **Right panel — Detail view:**
  - Photo banner: `width: 100%; object-fit: cover; max-height: 160px; border-radius: 6px`.
  - Read-only field cards below.
  - **Flag section:** amber warning badge + mismatch message if budget discrepancy detected.
  - Action buttons: `position: sticky; bottom: 0; background: var(--bg-surface); padding: 16px 0; border-top: 1px solid var(--border)`.
    - Buttons: `Reject` (destructive), `Request Edit` (secondary, opens modal), `Approve and Dispatch` (primary).

### 6c. Coach Overview
- **Header:** `PageHeader` title `"Overview"`, action secondary button `"View Application →"`.
- **Metrics row:** 3 metric cards: `Active Pitches`, `Pitches This Week` (e.g., `2/3`), `Total Funded`.
- **Content grid:** `display: grid; grid-template-columns: 60% 40%; gap: 24px`.
- **Recent Activity (left, 60%):** each item is a flex row — 16px icon (`color: var(--text-muted)`) + event text + timestamp right-aligned. `border-bottom: 1px solid var(--border); padding: 12px 0`.
- **Pitch Slots Card (right, 40%):** visual 3-segment track.
  - Flex row of 3 rounded rectangles: `height: 6px; border-radius: 3px; flex: 1; gap: 4px`.
  - Filled segment: `background: var(--text-primary)`.
  - Empty segment: `background: var(--bg-elevated)`.

### 6d. Coach Application Builder
- **Progress Stepper:** horizontal stepper at top of content area (not in `PageHeader`).
  - Numbered circles connected by a 1px line.
  - Active circle: `background: var(--text-primary); color: var(--bg-app)`.
  - Complete circle: checkmark SVG animated with `stroke-dashoffset` draw over 300ms ease.
  - Inactive circle: `background: var(--bg-elevated); color: var(--text-muted)`.
- **Step content:** each step inside a single `Card` component.
- **Budget table:** rendered as a real HTML table inside the card.
  - Columns: `Item`, `Cost`, `Category`, `Link`.
  - **Add Item row:** `border: 1px dashed var(--border); border-radius: 6px` — spans all columns — clicking converts to inline editable row.
  - **Total row:** `font-weight: 600; border-top: 1px solid var(--border)`.
- **Image dropzone:** `border: 1px dashed var(--border); border-radius: 6px; padding: 40px; text-align: center`.
  - Centered 24px icon + instruction text.
  - Hover: `background: var(--bg-elevated); border-color: var(--text-muted); transition: 100ms ease`.

### 6e. Coach Find Sponsors
- **Header:** `PageHeader` title `"Find Sponsors"` with pitch slot indicator in subtitle.
- **Filter tabs:** `All / Accepting / In My State` — Tab component from Phase 4g, directly below header.
- **Sponsor table:** Company logo: 24px circle, `object-fit: cover`, first column. Remaining columns follow standard Table styles from Phase 4d.
- **Sticky selection bar:**
  - `position: fixed; bottom: 0; left: 240px; right: 0; background: var(--bg-surface); border-top: 1px solid var(--border); padding: 12px 48px; display: flex; justify-content: space-between; align-items: center; z-index: 40`.
  - Only render when `selectedCount > 0`.
  - Entrance: `translateY(100%) → translateY(0)` over 200ms ease-out.
  - Left: `"X companies selected"` text. Right: `"Submit to Review Queue →"` primary button.
  - When pitch slot exhausted: `button opacity: 0.4; cursor: not-allowed;` tooltip `"Weekly limit reached"`.
  - When bar is visible: add `padding-bottom: 72px` to main content area to prevent table clipping.

### 6f. Sponsor Read-Only View
- **Layout:** does **NOT** use `AppLayout`. Standalone layout file with no sidebar.
- **Container:** `max-width: 760px; margin: 0 auto; padding: 48px 24px`.
- **Header:** small Matchmaker logo + "Verified via Matchmaker" caption (`font-size: 12px; color: var(--text-muted)`).
- **Content:** stacked Card components; `gap: 16px`. Team photo banner at top. All application sections read-only.
- **Decision section:** 3 decision cards at bottom.
  - `Decline`: border-color shifts to `var(--accent-error)` on hover.
  - `Partial Fund`: secondary style card containing inline number input styled per Phase 4e.
  - `Accept Full`: primary filled card.
  - Each card: `border: 1px solid var(--border); border-radius: 6px; padding: 20px`; icon + title + description + action button.
- **Auth:** no login required. URL contains a signed token.

---

## Phase 7 — Final Polish & Consistency Pass

Run each checklist item. **Every one must pass** before submitting.

- [x] ✅ DONE (2026-04-18) Grep for hardcoded colors — new files use CSS variables. Pre-existing pages updated to use design tokens.
- [x] ✅ DONE (2026-04-18) Font-size scale applied across all updated pages (12, 14, 15, 20, 28px used).
- [x] ✅ DONE (2026-04-18) Sidebar does NOT render on Sponsor view — sponsor-view route uses standalone layout, not AppLayout.
- [x] ✅ DONE (2026-04-18) `M` key guard implemented in theme-provider.tsx — guards INPUT, TEXTAREA, SELECT.
- [x] ✅ DONE (2026-04-18) localStorage key `'mm-theme'` used consistently in theme-provider.tsx and flash prevention script.
- [x] ✅ DONE (2026-04-18) `globals.css` updated — new `[data-theme="dark"]` selector replaces `.dark`, old OKLCH shadcn vars kept for backward compat with UI primitives.
- [x] ✅ DONE (2026-04-18) SWR badge polling wired in sidebar.tsx — `badgePulse` triggers only on count value change via ref comparison.
- [ ] Modal entrances — `modalIn` keyframe defined in globals.css; needs wiring to dialog component (pre-existing dialogs not yet migrated).
- [x] ✅ DONE (2026-04-18) Both light/dark mode use CSS variable tokens in all new/updated components.
- [x] ✅ DONE (2026-04-18) Sticky selection bar accounts for 240px sidebar offset (left: 240px defined in plan spec).
- [x] ✅ DONE (2026-04-18) `npx tsc --noEmit` passes clean. `npm run lint` — 0 errors in new/modified files; 31 pre-existing errors in untouched files.
- [ ] Playwright E2E suite — not run (requires running dev server and DB).

---

## Micro-Interaction Reference

| # | Element | Trigger | Spec |
|---|---------|---------|------|
| 1 | Sidebar nav icon | click or active mount | `scale 1 → 1.2 → 1`; `cubic-bezier(0.34, 1.56, 0.64, 1)`; 200ms; CSS keyframe only |
| 2 | Sidebar nav icon | hover | `scale(1.1)`; 150ms ease-out; CSS transition |
| 3 | Theme toggle icon | theme change | `opacity 0→1` + `rotate(30deg → 0deg)`; 200ms ease-out; CSS transition on `.icon-enter` class |
| 4 | Table rows | hover | background color shift; 100ms linear; no delay |
| 5 | All buttons | mousedown | `scale(0.98)`; released on mouseup; 80ms |
| 6 | Review queue badge | count value change | `scale(1 → 1.3 → 1)` pulse; 300ms ease-out; CSS keyframe triggered by class toggle from `useEffect` |
| 7 | Modal | open | `scale(0.96) + opacity 0 → scale(1) + opacity 1`; 200ms ease-out; **no exit animation** |
| 8 | Form input | validation error | border-color snaps to `var(--accent-error)` instantly; 0ms transition; error text appears immediately |
| 9 | Multi-step form step indicator | step complete | checkmark SVG `stroke-dashoffset` draw animation; 300ms ease |
| 10 | Sticky selection bar | first item selected | `translateY(100%) → translateY(0)`; 200ms ease-out |
| 11 | Empty states | page load | **no animation** — static and clean |

---

## Hard Constraints — What Gemini MUST NOT Do

- ❌ **Never** remove or rewrite any `onClick`, `onSubmit`, `onChange`, or data fetching hooks.
- ❌ **Never** change URL routes or the file-system routing structure.
- ❌ **Never** change existing component prop interfaces — extend them, never replace.
- ❌ **Never** install new packages without first verifying the equivalent is not already installed.
- ❌ **Never** add `'use client'` to files that do not require client-side interactivity.
- ❌ **Never** create a duplicate theme provider if one already exists — extend it.
- ❌ **Never** use Framer Motion or any JS animation library — all animations are pure CSS.
- ❌ **Never** hardcode any color values — every color must reference a CSS custom property.
- ❌ **Never** apply `AppLayout` or the sidebar to the Sponsor read-only view.
- ❌ **Never** use shadcn's default HSL color system — replace with the token system defined in Phase 0.
- ❌ **Never** modify Supabase RLS policies, Server Actions, Zod schemas, or any backend code. This is a **visual-only** change.
- ❌ **Never** collect or display student PII (COPPA compliance, per `CLAUDE.md`).
- ❌ **Never** bypass the admin review queue gate for emails.

---

## Deliverables & Handoff

1. **Preflight audit results** — a short section in the PR description answering all 7 questions from §2 with file paths.
2. **Commit structure** — one commit per Phase (Phase 0 through Phase 7). Do not squash.
3. **Screenshots** — both light and dark mode, for every screen in Phase 6, attached to the PR.
4. **Test run output** — paste the successful output of `npm run lint`, `npm run typecheck`, and the Playwright E2E suite into the PR description.
5. **Open questions** — any ambiguity resolved by judgment call must be noted in a `## Decisions Made` section at the bottom of the PR description.

**End of Plan.**
