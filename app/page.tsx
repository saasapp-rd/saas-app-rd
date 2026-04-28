import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>

      {/* Top bar */}
      <header
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ backgroundColor: '#A6192E' }}
      >
        <span className="text-white text-xs font-bold tracking-[0.25em] uppercase">
          Seattle Academy
        </span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-100" />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">

        {/* SAAS Logo */}
        <div className="mb-8">
          <Image
            src="/images/SAASLogo.png"
            alt="SAAS Seattle Academy"
            width={280}
            height={93}
            priority
            className="w-full max-w-[280px] h-auto"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-[280px] mb-8">
          <div className="flex-1 h-px" style={{ backgroundColor: '#EAEAEA' }} />
          <div
            className="w-2 h-2 rotate-45 flex-shrink-0"
            style={{ backgroundColor: '#A6192E' }}
          />
          <div className="flex-1 h-px" style={{ backgroundColor: '#EAEAEA' }} />
        </div>

        {/* Coming Soon pill */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
          style={{ backgroundColor: '#EAEAEA' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
            style={{ backgroundColor: '#CE2033' }}
          />
          <span
            className="text-[10px] font-bold tracking-[0.25em] uppercase"
            style={{ color: '#A6192E' }}
          >
            Coming Soon
          </span>
        </div>

        {/* App name */}
        <h1
          className="text-2xl font-bold mb-3 leading-snug"
          style={{ color: '#3D3D3D' }}
        >
          SAAS RD App
        </h1>

        {/* Tagline */}
        <p
          className="text-sm leading-relaxed max-w-[260px] mb-12"
          style={{ color: '#3D3D3D', opacity: 0.6 }}
        >
          Helping administrators do their job
          <br />one spreadsheet at a time
        </p>

        {/* Button styles */}
        <div className="w-full max-w-[280px] space-y-3">
          <p
            className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4 text-center"
            style={{ color: '#3D3D3D', opacity: 0.35 }}
          >
            Button Styles
          </p>

          <button
            className="w-full py-4 rounded-xl text-white text-sm font-semibold tracking-wide transition-opacity active:opacity-80"
            style={{ backgroundColor: '#A6192E' }}
          >
            Solid — Primary Action
          </button>

          <button
            className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide bg-transparent transition-all active:opacity-70"
            style={{ border: '2px solid #A6192E', color: '#A6192E' }}
          >
            Outlined — Secondary
          </button>

          <button
            className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide transition-all active:opacity-70"
            style={{ backgroundColor: '#EAEAEA', color: '#3D3D3D' }}
          >
            Ghost — Tertiary
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 text-center border-t" style={{ borderColor: '#EAEAEA' }}>
        <p
          className="text-[9px] tracking-[0.2em] uppercase"
          style={{ color: '#3D3D3D', opacity: 0.3 }}
        >
          © 2026 Seattle Academy of Arts &amp; Sciences
        </p>
      </footer>

    </div>
  )
}
