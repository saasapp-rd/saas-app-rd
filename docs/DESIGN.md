# Design System

**Status: LOCKED — 2026-04-28**
> Do not change colors, typography, or layout without updating this document.

---

## Brand Reference
- Primary reference: [seattleacademy.org](https://www.seattleacademy.org)
- Style guide: delivered 2026-04-28 (color palette + logos)

---

## Color Palette
| Token | Hex | PMS | Usage |
|---|---|---|---|
| SAAS Red | `#A6192E` | 187 C | Primary brand — headers, buttons, logo, accents |
| Athletic Red | `#CE2033` | 1795 C | Hover states, animated dots, highlights |
| Dark Red | `#810D1E` | 1815 CP | Active/pressed states, deep accents |
| Dark Grey | `#3D3D3D` | 447 C | All body text, headings, subtext, footers |
| Light Grey | `#EAEAEA` | Cool Grey 1 | Page backgrounds, dividers, ghost buttons, pills |
| White | `#FFFFFF` | — | Page background, text on red |

### Tailwind Tokens
```
saas-red            → #A6192E
saas-red-athletic   → #CE2033
saas-red-dark       → #810D1E
saas-grey           → #3D3D3D
saas-grey-light     → #EAEAEA
```

---

## Typography
| Role | Font | Weight | Notes |
|---|---|---|---|
| All UI | Inter (Google Fonts) | 400–900 | Applied globally via `app/layout.tsx` |
| Wordmark | Inter Black | 900 | `clamp(4rem, 22vw, 7rem)`, tracking -0.03em |
| Subtext labels | Inter Bold | 700 | `tracking-[0.35em]`, 10px, uppercase |
| Headings | Inter Bold | 700 | `text-2xl` |
| Body / taglines | Inter Regular | 400 | `text-sm`, opacity 0.6 |
| Labels / caps | Inter Bold | 700 | `text-[9-10px]`, wide tracking |

---

## Button Styles (Locked)
| Style | Hex Background | Border | Text Color | Radius | Height | Use for |
|---|---|---|---|---|---|---|
| **Solid** | `#A6192E` | None | White | `rounded-xl` | `py-4` (~52px) | Primary CTA |
| **Outlined** | Transparent | `2px solid #A6192E` | `#A6192E` | `rounded-xl` | `py-4` | Secondary action |
| **Ghost** | `#EAEAEA` | None | `#3D3D3D` | `rounded-xl` | `py-4` | Tertiary / cancel |

---

## Layout & Mobile Optimization
- **Mobile-first** — designed for 375px (iPhone) as baseline
- **Wordmark**: `clamp(4rem, 22vw, 7rem)` — scales safely from 320px to desktop
- **Content width**: `max-w-[280px]` for buttons/text blocks
- **Touch targets**: minimum `py-4` (≥48px height) on all interactive elements
- **No horizontal scroll**: all content constrained within viewport
- **Viewport**: managed automatically by Next.js App Router
- **Background**: White `#FFFFFF`
- **Top bar**: SAAS Red `#A6192E`, white text, `px-5 py-3.5`

---

## Logo Assets
- Folder: `public/images/` (files pending upload)
- Wordmark: SAAS + "Seattle Academy" horizontal lockup
- Athletic logo: Cardinal head + SAAS + Seattle Academy
- Mascot: Cardinal head standalone
- **Current**: CSS text fallback — replace with `<Image>` once files are uploaded

---

## Page Structure (Coming Soon)
```
┌─────────────────────────────┐
│  SEATTLE ACADEMY  [● ● ●]   │  ← SAAS Red bar
├─────────────────────────────┤
│                             │
│       SAAS                  │  ← Wordmark (clamp font)
│    seattle academy          │  ← Small caps subtitle
│                             │
│    ──── ◆ ────              │  ← Divider
│                             │
│    · COMING SOON ·          │  ← Pill badge, EAEAEA bg
│                             │
│    SAAS RD App              │  ← h1, Dark Grey
│    Helping administrators…  │  ← tagline, 60% opacity
│                             │
│    [  Solid Button    ]     │
│    [  Outlined Button ]     │
│    [  Ghost Button    ]     │
│                             │
├─────────────────────────────┤
│  © 2026 Seattle Academy     │  ← Footer, EAEAEA border-top
└─────────────────────────────┘
```

---

## Design Decisions Log
| Date | Decision | Reason |
|---|---|---|
| 2026-04-27 | Initial navy + red palette | Placeholder before style guide |
| 2026-04-28 | Switched to official SAAS brand colors | Style guide delivered |
| 2026-04-28 | White page background | Cleaner for admin app context |
| 2026-04-28 | Inter font | Matches brand weight, free via Google Fonts |
| 2026-04-28 | Mobile-first layout | Primary use case is phone/tablet |
| 2026-04-28 | `clamp()` for wordmark font size | Prevents overflow on 320px phones |
| 2026-04-28 | Design locked | Approved by user |
