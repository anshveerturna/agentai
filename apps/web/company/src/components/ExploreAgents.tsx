
'use client';

import { templates as sharedTemplates, type AgentTemplate } from '@/data/templates';

type Variant = 'grid' | 'landscape';

interface ExploreAgentsProps {
  onSelectTemplate: (template: AgentTemplate) => void;
  title?: string;
  variant?: Variant;
}

export default function ExploreAgents({ onSelectTemplate, title = 'Explore agents', variant = 'grid' }: ExploreAgentsProps) {
  const agentTemplates = sharedTemplates.filter((t) => t.source !== 'zapier');

  return (
  <div className="bg-card border border-border rounded-lg p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
  <h2 className="text-lg md:text-xl font-semibold text-foreground">{title}</h2>
        <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
          See more
        </button>
      </div>

      {variant === 'landscape' ? (
        <div className="w-full max-w-full overflow-x-auto px-1">
          <div className="flex gap-3 md:gap-4">
            {agentTemplates.map((template) => (
              <div
                key={template.id}
                className="min-w-[260px] md:min-w-[300px] cursor-pointer border border-border rounded-lg p-3 md:p-4 hover:border-ring/60 hover:shadow-sm transition-colors bg-card"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-lg md:text-xl">
                    {template.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-card-foreground text-[15px] truncate">{template.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hidden md:inline">Template</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentTemplates.map((template) => (
            <div
              key={template.id}
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm theme-transition cursor-pointer"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-start space-x-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-xl">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-white text-sm">
                    {template.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Template</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {template.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
