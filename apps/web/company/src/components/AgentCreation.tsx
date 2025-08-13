'use client';

import { useState } from 'react';

interface AgentCreationProps {
  onCreateAgent: (description: string) => void;
}

export default function AgentCreation({ onCreateAgent }: AgentCreationProps) {
  const [description, setDescription] = useState('');
  
  const quickSuggestions = [
    'Helpdesk',
    'Expense tracking', 
    'HR and benefits'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onCreateAgent(description);
      setDescription('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8">
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4">
          Describe your agent to create it
        </h1>
        
        {/* Quick Suggestions */}
        <div className="flex justify-center gap-3 mb-8">
          {quickSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setDescription(suggestion)}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative mb-6">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Use everyday words to describe what your agent should do"
            className="w-full h-24 p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <button
            type="submit"
            disabled={!description.trim()}
            className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>

      {/* Feature Note */}
      <div className="text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Features labeled as 'preview' are subject to supplemental terms. 
          <button className="text-blue-600 dark:text-blue-400 hover:underline ml-1">See terms</button>
        </p>
      </div>
    </div>
  );
}
