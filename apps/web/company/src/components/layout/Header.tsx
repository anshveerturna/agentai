export function Header() {
  return (
    <header className="flex items-center justify-between h-16 px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 tracking-tight">Jinni</span>
        <span className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">Environment: Amity University (default)</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
        <img src="/avatar.png" alt="User Avatar" className="w-8 h-8 rounded-full border-2 border-blue-500" />
      </div>
    </header>
  );
}
