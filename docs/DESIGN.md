# Design System

> Living document. Update whenever visual decisions are made or a style guide is provided.

## Brand Reference
- Primary reference: [seattleacademy.org](https://www.seattleacademy.org)
- Full style guide: _pending — to be provided_

## Current Color Palette
| Token | Value | Usage |
|---|---|---|
| Navy 900 | `#0a1628` | Page backgrounds |
| Navy 800 | `#0f2240` | Gradient mid |
| Navy 700 | `#1a3a5c` | Gradient end |
| Red accent | `#dc2626` | Dividers, badges, highlights |
| Blue 200 | `#bfdbfe` | Taglines, secondary text |
| White | `#ffffff` | Primary headings |

## Typography
| Role | Font | Weight | Notes |
|---|---|---|---|
| Body / UI | Inter (Google Fonts) | 400, 600, 700 | Applied globally via `app/layout.tsx` |
| Headings | Inter | 700 (bold) | Tight tracking |
| Subheadings | Inter | 300 (light) | Wide tracking |

## Spacing & Layout
- Max content width: `max-w-2xl` (42rem)
- Base padding: `px-6`
- Full-height pages: `min-h-screen`

## Component Patterns
- **Pill badges**: rounded-full, border + bg at 10% opacity, small caps tracking
- **Dividers**: gradient fade + rotated diamond center icon
- **Backgrounds**: diagonal gradient + dot grid overlay at 6% opacity

## Design Decisions Log
| Date | Decision | Reason |
|---|---|---|
| 2026-04-27 | Navy + red palette | Matches Seattle Academy brand |
| 2026-04-27 | Inter font | Clean, professional, free via Google Fonts |
| 2026-04-27 | No email capture on Coming Soon | User preference |

---
_Update this file whenever new components, colors, or fonts are added._
