'use client';

type Variant = 'grid' | 'landscape';

export default function LearningResources({ variant = 'grid' }: { variant?: Variant }) {
  const cards = [
    { id: 'docs', title: 'Documentation', desc: 'Browse developer guides and API docs.' },
    { id: 'best', title: 'Best practices', desc: 'Design patterns for reliable agents.' },
    { id: 'security', title: 'Security & governance', desc: 'Policies, RBAC, and data controls.' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">Learning resources</h2>
        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
          View all
        </button>
      </div>

      {variant === 'landscape' ? (
        <div className="w-full max-w-full overflow-x-auto px-1">
          <div className="flex gap-3 md:gap-4">
            {cards.map((c) => (
              <div key={c.id} className="min-w-[260px] md:min-w-[300px] border border-slate-200/80 dark:border-slate-800/80 rounded-lg p-3 md:p-4 bg-white dark:bg-slate-900 hover:border-blue-300/70 dark:hover:border-blue-600/70 hover:shadow-sm transition-colors">
                <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>
                </div>
                <div className="text-slate-900 dark:text-white font-medium">{c.title}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>
              </div>
              <div className="text-slate-900 dark:text-white font-medium">{c.title}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">{c.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
