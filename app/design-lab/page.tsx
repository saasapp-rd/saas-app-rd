// /design-lab — Design System Reference Page
// Access: Super Admin dashboard only. Not linked anywhere public.
// Purpose: Live reference for brand colors, typography, button styles.

import Image from 'next/image'

export default function DesignLabPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>

      {/* Top bar */}
      <header
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ backgroundColor: '#A6192E' }}
      >
        <span className="text-white text-xs font-bold tracking-[0.25em] uppercase">
          Design Lab
        </span>
        <span
          className="text-[9px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          Admin Only
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-10">

        {/* ── Section: Logo ───────────────────────────── */}
        <section className="w-full max-w-[320px] mb-10">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Logo Assets
          </p>
          <div className="flex flex-col items-center gap-6 p-6 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EAEAEA' }}>
            <Image
              src="/images/SAASLogo.png"
              alt="SAAS Seattle Academy Wordmark"
              width={280}
              height={93}
              priority
              className="w-full max-w-[280px] h-auto"
            />
            <div className="w-full h-px" style={{ backgroundColor: '#EAEAEA' }} />
            <Image
              src="/images/SAASLogo.png"
              alt="SAAS on dark"
              width={200}
              height={66}
              className="w-full max-w-[200px] h-auto"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <p className="text-[9px]" style={{ color: '#999' }}>Inverted — for use on dark/red backgrounds</p>
          </div>
        </section>

        {/* ── Section: Color Palette ───────────────────── */}
        <section className="w-full max-w-[320px] mb-10">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Color Palette
          </p>
          <div className="flex flex-col gap-2">
            {[
              { name: 'SAAS Red', hex: '#A6192E', usage: 'Headers, buttons, logo, accents — PMS 187 C' },
              { name: 'Athletic Red', hex: '#CE2033', usage: 'Hover, animated dots, highlights — PMS 1795 C' },
              { name: 'Dark Red', hex: '#810D1E', usage: 'Active/pressed states — PMS 1815 CP' },
              { name: 'Dark Grey', hex: '#3D3D3D', usage: 'All body text, headings — PMS 447 C' },
              { name: 'Light Grey', hex: '#EAEAEA', usage: 'Backgrounds, dividers, ghost buttons' },
              { name: 'White', hex: '#FFFFFF', usage: 'Page background, text on red' },
            ].map(({ name, hex, usage }) => (
              <div key={hex} className="flex items-center gap-3 p-3 rounded-lg" style={{ border: '1px solid #EAEAEA' }}>
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: hex, border: hex === '#FFFFFF' ? '1px solid #EAEAEA' : 'none' }}
                />
                <div>
                  <div className="text-xs font-bold" style={{ color: '#3D3D3D' }}>{name}</div>
                  <div className="text-[10px] font-mono" style={{ color: '#A6192E' }}>{hex}</div>
                  <div className="text-[9px]" style={{ color: '#999' }}>{usage}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: Typography ─────────────────────── */}
        <section className="w-full max-w-[320px] mb-10">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Typography
          </p>
          <div className="flex flex-col gap-4 p-5 rounded-xl" style={{ border: '1px solid #EAEAEA' }}>
            <div>
              <div
                className="font-black leading-none mb-1"
                style={{ color: '#A6192E', fontSize: 'clamp(3rem, 18vw, 5rem)', letterSpacing: '-0.03em' }}
              >
                SAAS
              </div>
              <div className="text-[9px]" style={{ color: '#999' }}>Wordmark — Inter Black 900 — clamp(4rem, 22vw, 7rem) — tracking -0.03em</div>
            </div>
            <div className="h-px" style={{ backgroundColor: '#EAEAEA' }} />
            <div>
              <div className="text-2xl font-bold mb-1" style={{ color: '#3D3D3D' }}>Heading — SAAS RD App</div>
              <div className="text-[9px]" style={{ color: '#999' }}>Inter Bold 700 — text-2xl</div>
            </div>
            <div className="h-px" style={{ backgroundColor: '#EAEAEA' }} />
            <div>
              <div className="text-sm leading-relaxed mb-1" style={{ color: '#3D3D3D', opacity: 0.6 }}>Body — Helping administrators do their job one spreadsheet at a time</div>
              <div className="text-[9px]" style={{ color: '#999' }}>Inter Regular 400 — text-sm — opacity 0.6</div>
            </div>
            <div className="h-px" style={{ backgroundColor: '#EAEAEA' }} />
            <div>
              <div
                className="text-[10px] font-bold tracking-[0.35em] uppercase mb-1"
                style={{ color: '#3D3D3D' }}
              >
                Label — Seattle Academy
              </div>
              <div className="text-[9px]" style={{ color: '#999' }}>Inter Bold 700 — 10px — tracking-[0.35em] — uppercase</div>
            </div>
          </div>
        </section>

        {/* ── Section: Divider ────────────────────────── */}
        <section className="w-full max-w-[320px] mb-10">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Decorative Divider
          </p>
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px" style={{ backgroundColor: '#EAEAEA' }} />
            <div className="w-2 h-2 rotate-45 flex-shrink-0" style={{ backgroundColor: '#A6192E' }} />
            <div className="flex-1 h-px" style={{ backgroundColor: '#EAEAEA' }} />
          </div>
        </section>

        {/* ── Section: Button Styles ──────────────────── */}
        <section className="w-full max-w-[320px] mb-10">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Button Styles (Locked)
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <button
                className="w-full py-4 rounded-xl text-white text-sm font-semibold tracking-wide transition-opacity active:opacity-80"
                style={{ backgroundColor: '#A6192E' }}
              >
                Solid — Primary Action
              </button>
              <p className="text-[9px] mt-1 pl-1" style={{ color: '#999' }}>bg #A6192E — rounded-xl — py-4 — white text — Primary CTA</p>
            </div>
            <div>
              <button
                className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide bg-transparent transition-all active:opacity-70"
                style={{ border: '2px solid #A6192E', color: '#A6192E' }}
              >
                Outlined — Secondary
              </button>
              <p className="text-[9px] mt-1 pl-1" style={{ color: '#999' }}>border 2px #A6192E — transparent bg — Secondary action</p>
            </div>
            <div>
              <button
                className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide transition-all active:opacity-70"
                style={{ backgroundColor: '#EAEAEA', color: '#3D3D3D' }}
              >
                Ghost — Tertiary
              </button>
              <p className="text-[9px] mt-1 pl-1" style={{ color: '#999' }}>bg #EAEAEA — text #3D3D3D — Tertiary / cancel</p>
            </div>
          </div>
        </section>

        {/* ── Section: Status Badges ──────────────────── */}
        <section className="w-full max-w-[320px] mb-10">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Status Badges
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Elevated', bg: '#FFF0F0', color: '#A6192E' },
              { label: 'Emergency', bg: '#A6192E', color: '#fff' },
              { label: 'Routine', bg: '#FFF8E0', color: '#8B6200' },
              { label: 'Resolved', bg: '#E8F5E9', color: '#1B5E20' },
              { label: 'Coming Soon', bg: '#EAEAEA', color: '#A6192E' },
            ].map(({ label, bg, color }) => (
              <div
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.15em] uppercase"
                style={{ backgroundColor: bg, color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* ── Section: Coming Soon page preview ──────── */}
        <section className="w-full max-w-[320px] mb-10">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Original Coming Soon Page — Preserved
          </p>
          <div
            className="flex flex-col items-center text-center p-8 rounded-xl"
            style={{ border: '1px solid #EAEAEA', backgroundColor: '#FAFAFA' }}
          >
            <Image
              src="/images/SAASLogo.png"
              alt="SAAS Seattle Academy"
              width={200}
              height={66}
              className="w-full max-w-[200px] h-auto mb-6"
            />
            <div className="flex items-center gap-3 w-full max-w-[200px] mb-6">
              <div className="flex-1 h-px" style={{ backgroundColor: '#EAEAEA' }} />
              <div className="w-2 h-2 rotate-45 flex-shrink-0" style={{ backgroundColor: '#A6192E' }} />
              <div className="flex-1 h-px" style={{ backgroundColor: '#EAEAEA' }} />
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: '#EAEAEA' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: '#CE2033' }} />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#A6192E' }}>Coming Soon</span>
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ color: '#3D3D3D' }}>SAAS RD App</h1>
            <p className="text-xs leading-relaxed" style={{ color: '#3D3D3D', opacity: 0.6 }}>
              Helping administrators do their job<br />one spreadsheet at a time
            </p>
          </div>
        </section>

      </main>

      <footer className="px-6 py-5 text-center border-t" style={{ borderColor: '#EAEAEA' }}>
        <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: '#3D3D3D', opacity: 0.3 }}>
          SAAS RD App &mdash; Design Lab &mdash; Admin Access Only
        </p>
      </footer>

    </div>
  )
}
