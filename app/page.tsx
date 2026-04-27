export default function Home() {
  return (
    <main
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0f2240 50%, #1a3a5c 100%)' }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">

        {/* Coming Soon pill */}
        <div className="inline-flex items-center gap-2 mb-10 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-[0.2em] text-red-400 uppercase">
            Coming Soon
          </span>
        </div>

        {/* App name */}
        <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight leading-none mb-4">
          SAAS RD
          <span className="block text-4xl md:text-5xl font-light text-blue-300 mt-2 tracking-widest">
            APP
          </span>
        </h1>

        {/* Red divider */}
        <div className="flex items-center justify-center gap-2 my-8">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-red-600" />
          <div className="w-2 h-2 rotate-45 bg-red-600" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-red-600" />
        </div>

        {/* Tagline */}
        <p className="text-lg md:text-xl text-blue-200/75 font-light leading-relaxed max-w-md mx-auto">
          Helping administrators do their job
          <br />
          <em className="not-italic text-blue-100/90">one spreadsheet at a time</em>
        </p>

        {/* Footer credit */}
        <p className="mt-16 text-xs tracking-widest text-white/20 uppercase">
          Seattle Academy of Arts &amp; Sciences
        </p>
      </div>
    </main>
  )
}
