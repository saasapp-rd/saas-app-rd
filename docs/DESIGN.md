# Design System

> Living document. Update whenever visual decisions are made.

## Brand Reference
- Primary reference: [seattleacademy.org](https://www.seattleacademy.org)
- Style guide: delivered 2026-04-28 (color palette + logos)

## Color Palette
| Token | Hex | PMS | Usage |
|---|---|---|---|
| SAAS Red | `#A6192E` | 187 C | Primary brand color, headers, buttons, accents |
| Athletic Red | `#CE2033` | 1795 C | Hover states, animated dots, highlights |
| Dark Red | `#810D1E` | 1815 CP | Active/pressed states, deep accents |
| Dark Grey | `#3D3D3D` | 447 C | Body text, headings, footers |
| Light Grey | `#EAEAEA` | Cool Grey 1 | Backgrounds, dividers, ghost buttons |
| White | `#FFFFFF` | — | Page backgrounds, text on red |

## Tailwind Tokens
```
saas-red           → #A6192E
saas-red-athletic  → #CE2033
saas-red-dark      → #810D1E
saas-grey          → #3D3D3D
saas-grey-light    → #EAEAEA
```

## Typography
| Role | Font | Weight | Notes |
|---|---|---|---|
| All UI | Inter (Google Fonts) | 400–900 | Applied globally via `app/layout.tsx` |
| Wordmark | Inter Black | 900 | SAAS letters, tight tracking -0.03em |
| Subtext | Inter Bold | 700 | Wide tracking 0.3em+, small caps |
| Body | Inter Regular | 400 | Taglines, descriptions |

## Logo Assets
- Logo files: `public/images/` (pending upload)
- Wordmark: SAAS + "Seattle Academy" lockup
- Mascot: Cardinal (red/black/yellow)
- Athletics logo: SAAS + Cardinal head
- Use text fallback until images uploaded

## Button Styles
| Style | Background | Border | Text | Use for |
|---|---|---|---|---|
| Solid | `#A6192E` | — | White | Primary CTA |
| Outlined | Transparent | `2px #A6192E` | `#A6192E` | Secondary action |
| Ghost | `#EAEAEA` | — | `#3D3D3D` | Tertiary / cancel |

## Layout
- Mobile-first, max content width: `280–320px` on phone
- Min touch target: `py-4` (48px height) on buttons
- Page background: White `#FFFFFF`
- Top bar: SAAS Red `#A6192E` with white text

## Design Decisions Log
| Date | Decision | Reason |
|---|---|---|
| 2026-04-27 | Initial navy + red palette | Placeholder before style guide |
| 2026-04-28 | Switched to official SAAS brand colors | Style guide delivered |
| 2026-04-28 | White page background | Cleaner for admin app context |
| 2026-04-28 | Inter font | Clean, professional, matches brand weight |
| 2026-04-28 | Mobile-first layout | Primary use case is phone/tablet |
