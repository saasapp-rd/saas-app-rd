# Architecture, Security & Database Design

> Structural decisions, security posture, and data model.
> Update whenever significant technical decisions are made.

## Stack
| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 15 (App Router) | Deployed on Vercel |
| Language | TypeScript | Strict mode enabled |
| Styling | Tailwind CSS v3 | Utility-first |
| Hosting | Vercel | Auto-deploy from GitHub `main` |
| Source control | GitHub | `saasapp-rd/saas-app-rd` |
| Database | _TBD_ | See candidates below |
| Auth | _TBD_ | See candidates below |

## Repository Structure
```
saas-app-rd/
├── app/                  # Next.js App Router
│   ├── layout.tsx        # Root layout, global font
│   ├── page.tsx          # Home / Coming Soon
│   └── globals.css       # Tailwind base styles
├── docs/                 # This documentation
├── next.config.mjs       # Next.js config
├── tailwind.config.ts    # Tailwind theme
├── tsconfig.json         # TypeScript config
└── package.json
```

## Database Candidates
| Option | Pros | Cons |
|---|---|---|
| Supabase (Postgres) | Managed, auth built-in, good free tier | Vendor lock-in |
| PlanetScale (MySQL) | Branching, great DX | MySQL dialect |
| Turso (SQLite/libSQL) | Edge-native, very cheap | Less ecosystem |
| Neon (Postgres) | Serverless Postgres, Vercel-native | Newer, smaller community |

_Decision pending — to be made when user/data features begin._

## Authentication Candidates
- **NextAuth.js** — flexible, many providers, open source
- **Clerk** — easiest DX, generous free tier, drop-in UI
- **Supabase Auth** — built-in if using Supabase DB

## Security Posture
- [ ] Environment variables stored in Vercel dashboard only (never committed)
- [ ] GitHub token scoped to minimum required permissions
- [ ] HTTPS enforced by Vercel on all deployments
- [ ] Content Security Policy headers — _to be added_
- [ ] Input sanitization — _required before any user data handling_
- [ ] Rate limiting on API routes — _required before public launch_
- [ ] Dependency audit: `npm audit` on every PR — _to be set up via GitHub Actions_

## Data Privacy
- No PII collected currently (Coming Soon page has no forms)
- When student/staff data is introduced: FERPA compliance required
- Data retention policy: _TBD_

---
_Update when database, auth, or infrastructure decisions are finalized._
