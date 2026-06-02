export default function AccountPage() {
  return (
    <div className="max-w-md mx-auto py-14 px-4">
      <div className="text-center mb-10">
        <span className="text-5xl">🐾</span>
        <h1 className="text-2xl font-bold text-slate-900 mt-4 mb-2">Welcome to PawLocal</h1>
        <p className="text-sm text-slate-500">Who are you here as?</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Pet Owner */}
        <a
          href="/my-account"
          className="group bg-white border-2 border-border hover:border-[var(--pl-teal)] rounded-2xl p-6 transition-all hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl flex-shrink-0">
              🐶
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[var(--pl-teal)] transition-colors">
                I'm a pet owner
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                See your pet broadcasts, saved providers, and reviews you've written.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['📣 My broadcasts', '❤️ Saved providers', '⭐ My reviews'].map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </a>

        {/* Provider */}
        <a
          href="/my-listing"
          className="group bg-white border-2 border-border hover:border-[var(--pl-teal)] rounded-2xl p-6 transition-all hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-3xl flex-shrink-0">
              🏪
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[var(--pl-teal)] transition-colors">
                I'm a service provider
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Access your dashboard, edit your listing, and track your stats and points.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['📊 Stats', '🏆 Points', '✏️ Edit listing'].map(tag => (
                  <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </a>

        {/* Not registered yet */}
        <div className="text-center pt-2">
          <p className="text-sm text-slate-400">
            New here?{' '}
            <a href="/join" className="text-[var(--pl-amber)] font-semibold hover:underline">
              List your service free →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
