# Priorities & Build Status

**Last updated: 2026-05-13**
> Detailed wave plan: `docs/BUILD_WAVES.md`

---

## What's Built ✅

### Foundation & Auth
| Item | Notes |
|---|---|
| GitHub + Vercel connected | Auto-deploy from `main` |
| Design system | Locked in `DESIGN.md` — cardinal red, typography, buttons |
| Test auth (8 roles) | next-auth CredentialsProvider, all pw: `saas2026` |
| `/login` page | Quick-select role buttons + manual username/password |

### Database & Core Logic
| Item | Notes |
|---|---|
| Supabase connected | US region, service role + anon clients in `lib/supabase.ts` |
| Period / block detection | `lib/schedule.ts` — getCurrentPeriod(), block rotation, real-time |
| Session → DB user lookup | Role assigned on login, session carries userId + role |
| 12-table schema | `supabase/schema.sql` — students, courses, enrollments, incidents, etc. |
| Migrations | 9 applied — push subscriptions, RLS, incident notes, CSV import, more |

### Admin
| Item | Notes |
|---|---|
| `/admin` dashboard | Live missing-count widget + action cards |
| `/admin/users` | User list with role filter, search, active/inactive toggle |
| `/admin/users/[role]` | Per-role user list — edit name, email, phone |
| `/admin/import` | CSV import for students (name, grade, school ID) |
| `/admin/daily` | Daily incident log |
| `/admin/calendar` | School calendar editor (day types, holidays) |
| `/admin/courses` | Course builder (name, teacher, block, room) |
| `/admin/coordinators` | Coordinator block assignments |

### Teacher
| Item | Notes |
|---|---|
| `/teacher` | Current block roster + report missing + Student With Me |
| `/teacher/courses` | All courses as accordion cards — add/remove students inline |
| Enrollment API | `POST/DELETE /api/teacher/enrollment` — teacher-scoped, block uniqueness enforced |

### Coordinator
| Item | Notes |
|---|---|
| `/coordinator` | Live triage queue — imperfect attendance + open missing students |
| `/coordinator/[id]` | Full 6-step incident workflow — pull, locate, escalate, resolve |
| Step escalation | Auto-escalate routine → elevated after threshold |
| Found / With Me | Resolution actions with timestamps |
| Dean escalation | Escalate button on coordinator detail view |

### Counselor
| Item | Notes |
|---|---|
| `/counselor` | Caseload dashboard — flagged students with live active-incident badges |
| Concern flags | `student_concern_flags` table — counselors flag students to their caseload |

### Dean
| Item | Notes |
|---|---|
| `/dean` | Elevated incidents + attendance pattern summary |
| Family follow-up log | Log notes on elevated cases |

### Staff
| Item | Notes |
|---|---|
| `/staff` | Live missing-count widget — claim (found) action |
| Welfare concern form | `/staff/concern` — submits concern, notifies counselors |

### Shared / Cross-Role
| Item | Notes |
|---|---|
| `/missing` (Live View) | Real-time board — all open + located missing students, all staff roles |
| `/analytics` | Today + Patterns tabs — school-wide; counselor sees only their flagged students |
| `/students/[id]` | Student detail — incident history, concern flags, profile |
| Welfare Concern link | Bottom of every non-student role page |
| Push notifications | Web-push on new incidents (coordinator) and escalations (dean) |
| Incident notes | Private + public notes on incidents |
| `WelfareConcernLink` | Shared component — quiet bottom link on every role page |

### Infrastructure
| Item | Notes |
|---|---|
| RLS policies | Migration `003_rls_policies.sql` applied |
| Supabase Realtime | `/missing` page subscribes to live incident updates |
| `npx tsc --noEmit` clean | Strict TypeScript — zero errors |

---

## What's Not Built 🔴

| Item | Notes | Wave |
|---|---|---|
| Google SSO | Replace test auth with real @seattleacademy.org login | 8 |
| Email home at Step 3 | Resend wired but send-home flow not triggered from workflow | 5 |
| Block 1 email suppression | Logic exists in spec, not yet enforced on send | 5 |
| SMS / push to family | Provider not decided | 5 |
| Counselor auto-ping + escalation | 10-min escalation to counselor not yet built | 5 |
| Activity Tracker | Physical search log UI — spec not yet written | 9 |
| Veracross integration | API credentials not obtained | 10 |
| Sub / second teacher access | Temp roster access for subs — reserved in design | future |
| Student view | `/student` is a placeholder | future |
| Parent/guardian schema | Multiple parents, divorce handling — discussed, not started | future |

---

## Blocked On (External) 🟡

| Blocker | Needed For | Who |
|---|---|---|
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Wave 8 — Google SSO | Tech team |
| Redirect URI registered at Google Cloud Console | Wave 8 | Tech team |
| Veracross API access | Wave 10 — attendance auto-import | School admin |

---

## Open Decisions

| Decision | Status |
|---|---|
| Email provider for send-home | Resend is wired — just need to pull trigger in workflow |
| SMS provider (Twilio) | Not decided — needed for parent SMS |
| Counselor analytics default | All flagged students vs. elevated-only — not decided |
| Activity Tracker scope | Not specced yet — needed before Wave 9 |

---

## What's Next

**Immediate:** Merge PR #4 (rename + nav overhaul + analytics) → auto-deploys to Vercel.

**Short-term priorities:**
1. Wire email-home into Step 3 of coordinator workflow (Resend is already set up)
2. Write Activity Tracker spec
3. Obtain Google OAuth credentials from tech team → Wave 8

See `docs/BUILD_WAVES.md` for the full wave-by-wave task list.
