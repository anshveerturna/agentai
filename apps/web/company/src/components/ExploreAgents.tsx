'use client';

type Variant = 'grid' | 'landscape';

interface ExploreAgentsProps {
  onSelectTemplate: (template: any) => void;
  title?: string;
  variant?: Variant;
}

export default function ExploreAgents({ onSelectTemplate, title = 'Explore agents', variant = 'grid' }: ExploreAgentsProps) {
  const agentTemplates = [
    {
      id: 'website-qa',
      title: 'Website Q&A',
      icon: '🌐',
      description: 'Instantly answer user questions using the content of your website or other knowledge.',
      category: 'Agent template'
    },
    {
      id: 'safe-travels',
      title: 'Safe Travels',
      icon: '✈️',
      description: 'Provides answers to common travel questions and related health and safety guidelines.',
      category: 'Agent template'
    },
    {
      id: 'financial-insights',
      title: 'Financial Insights',
      icon: '💰',
      description: 'Help financial services professionals get quick and concise info from their org\'s financial documents and other available resources.',
      category: 'Agent template'
    },
    {
      id: 'benefits',
      title: 'Benefits',
      icon: '🏥',
      description: 'Benefits Agent provides personalized information on various benefits offered by the employer that are tailored to employee\'s unique circumstances.',
      category: 'Agent template'
    },
    {
      id: 'it-helpdesk',
      title: 'IT Helpdesk',
      icon: '💻',
      description: 'Empowers employees to resolve issues and effortlessly create/view support tickets.',
      category: 'Agent template'
    },
    {
      id: 'weather',
      title: 'Weather',
      icon: '🌤️',
      description: 'Your go-to assistant for getting weather forecast.',
      category: 'Agent template'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
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
                className="min-w-[260px] md:min-w-[300px] cursor-pointer border border-slate-200/80 dark:border-slate-800/80 rounded-lg p-3 md:p-4 hover:border-blue-300/70 dark:hover:border-blue-600/70 hover:shadow-sm transition-colors bg-white dark:bg-slate-900"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-lg md:text-xl">
                    {template.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900 dark:text-white text-[15px] truncate">{template.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hidden md:inline">{template.category}</span>
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
              className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer"
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {template.category}
                  </p>
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
