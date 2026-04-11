# Stripe-inspired dashboard design

Merchant **dashboard** chrome (shell, navigation, top bar) follows this system. **shadcn/ui** stays the component layer: customize via `className` on primitives and feature wrappers — do not remove shadcn.

Extended reference (external): [getdesign.md — Stripe design](https://getdesign.md/stripe/design-md)

---

## Principles

1. **Clarity over decoration** — flat surfaces, obvious hierarchy, minimal blur and gradient chrome.
2. **Light workspace** — white sidebar, soft gray (`zinc-50` / `zinc-100`) main canvas, white cards on pages.
3. **One accent for navigation focus** — violet family (Stripe’s brand purple: ~`#635BFF`) for **active nav** and subtle highlights; keep **primary CTAs** on shadcn `primary` / `secondary` tokens unless product explicitly rebrands.
4. **Density** — comfortable `text-sm` nav and tables; touch targets ≥ 44px on mobile (see `ux-rules.mdc`).

---

## Layout (dashboard shell)

| Region | Role | Tailwind-style guidance |
|--------|------|-------------------------|
| App root | Full height split | `flex h-screen overflow-hidden bg-zinc-50` |
| Sidebar (desktop) | Fixed column | `bg-white border-e border-zinc-200`, expanded `w-60`, collapsed **icon rail** `~w-[4.25rem]`; collapse toggle lives in **top bar** (left of search, `lg+`); nav labels → `sr-only` + `title` tooltip |
| Sidebar (mobile) | `Sheet` from shadcn | `bg-white` (not tinted glass); same nav content as desktop |
| Top bar | Sticky under shell | `bg-white border-b border-zinc-200`, height ~`h-14`–`h-16` |
| Main | Scrollable content | `flex-1 overflow-y-auto bg-zinc-50`, horizontal padding `px-4 lg:px-6`, vertical `py-4`–`py-6` |

---

## Navigation items

- **Default:** `text-zinc-600`, `rounded-md`, `px-2.5 py-2`, `text-sm font-medium`, `hover:bg-zinc-100`.
- **Active:** `bg-violet-50 text-violet-700` (or `text-violet-800`), optional `font-medium`.
- **Icons:** `lucide-react`, `h-4 w-4`, aligned with label; same color as text.
- Avoid heavy `rounded-xl` pills for nav rows; reserve stronger rounding for search fields or badges if needed.

---

## Top bar

- **Search trigger:** Looks like an input — `bg-white border border-zinc-200 rounded-md shadow-sm`, muted placeholder (French: **Rechercher…**), opens command `Dialog` (existing pattern).
- **Icon buttons:** `variant="ghost"` or outline, `rounded-md`, hover `bg-zinc-100`.
- **User menu trigger:** Small circle or rounded square, `border border-zinc-200`, initials centered.

---

## Pages (inside `main`)

- Use shadcn **`Card`** for grouped content: `bg-card` (white) on `bg-zinc-50` canvas.
- Page titles: `text-2xl font-semibold text-zinc-900`; subtitles `text-sm text-zinc-500`.
- Tables: default shadcn `Table`; header row subtle `text-zinc-500` / `text-xs` uppercase optional for column labels.

---

## What not to do (dashboard)

- Do not use **liquid glass** / heavy **backdrop-blur** on the main sidebar or top bar (Stripe dashboard is matte).
- Do not rely on **“no borders”** editorial rules for shell sectioning; **thin `border-zinc-200`** is correct here.
- **Order status** colors stay defined in `@/lib/utils` (`ORDER_STATUS_*`) — do not recolor order badges to violet.

---

## Files

- Reference implementation: `src/components/dashboard/shell/*`
- Cursor rules: `.cursor/rules/ui-components.mdc` (dashboard Stripe section + shadcn)
- Merchant UX copy: `.cursor/rules/ux-rules.mdc`

---

## Storefront / auth

Storefront and auth pages are **not** required to match this spec; they may keep the global theme in `src/styles/globals.css` (`:root` tokens). Only the **dashboard shell** must follow this document.
