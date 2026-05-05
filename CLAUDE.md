# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sunday Cool **Art Request Form** — a public, conversational intake form (chat-style UI) that walks customers through specifying an apparel or promo-item art project. Single-page Next.js 14 (App Router) app, fully client-side state machine, reads product catalog from Supabase, no auth.

## Commands

```bash
npm run dev      # next dev (http://localhost:3000)
npm run build    # next build
npm run start    # serve production build
npm run lint     # next lint
```

No test suite is configured.

### Required env vars (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Only the public anon key is used — there is no server-side Supabase client.

## Architecture

**One big state machine.** `src/components/ArtRequestForm.tsx` (~2100 lines) is the entire form. It is a single `'use client'` component driven by a `Step` union type (see the `type Step = ...` declaration near the top — currently ~17 steps covering apparel and promo flows). All transitions happen by calling `setStep(...)` plus a Framer Motion `useAnimationControls()` handle for that step.

- `src/app/page.tsx` just renders `<ArtRequestForm />`. `layout.tsx` and `globals.css` are minimal.
- Sub-components (`ChatBubble`, `TypingIndicator`, `ProductTypeCard`, `ColorSwatch`, `ProductSummaryModal`, `TemplatePicker`, `CreativeQuestionnaire`) are presentational; the parent owns all flow state.
- `LocationData` is the per-print-location record. The form supports **multiple print locations per garment** — when the user chooses "add another location" the current `LocationData` is pushed into a list and a new one is started, so most apparel state is duplicated in the working draft vs. the saved-locations array.
- Apparel and Promo are two distinct branches of the state machine that share early steps (welcome → product-type) and the color-select UI but diverge afterward (apparel: artwork-type → template/upload → placement → ink → review; promo: art-concept → art-files → review).

### Supabase data model (read-only from this app)

Two catalog tables are queried directly by the client:

- **`apparel`** — columns used: `product_category`, `color_name`, `material`, `adult_sizes`, `youth_sizes`, `printability`, `available_decorations`, image fields (sizing filter uses `.not('adult_sizes', 'is', null)` etc.)
- **`promo_items`** — columns used: `product_category`, `product_name`, `color_name`, `decoration_options`, `printable_area`

The form filters categories/products/colors progressively as the user advances. There is **no submission endpoint wired up yet** — the "review" steps display a summary but no `insert` into Supabase or storage upload exists in the code. When implementing submission, that's a greenfield addition.

### Animation pattern

Each step has its own `useAnimationControls()` instance and the next step's animation is `.start()`-ed inside the handler that sets the step. When adding a new step, add: (1) a literal to the `Step` union, (2) an animation control, (3) a transition handler, (4) a JSX block keyed on `step ===`.

## Conventions

- Path alias `@/*` → `src/*` (see `tsconfig.json`).
- Tailwind CSS v3 with the standard `tailwind.config.js` content globs over `src/**`.
- No shadcn/ui — components are hand-rolled with Tailwind + Framer Motion.
- Product/color images are loaded from a Webflow CDN via `next/image`; if you add new image hosts, update `next.config.js` `images.remotePatterns`.
- Form is anonymous and unauthenticated — never add `profiles`, RLS-gated, or service-role logic without first confirming intent.
