
import { DashboardLayout } from '../components/layout/DashboardLayout';
import AgentList from '../components/AgentList';
import { CreateAgentDialog } from '../components/CreateAgentDialog';

export default function HomePage() {
  return (
    <DashboardLayout>
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center py-12 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl mb-8 shadow-md">
        <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 dark:text-blue-400 mb-4 text-center">Describe your agent to create it</h1>
        <div className="flex gap-4 mb-6">
          <button className="px-6 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors">Helpdesk</button>
          <button className="px-6 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors">Expense tracking</button>
          <button className="px-6 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors">HR and benefits</button>
        </div>
        <div className="w-full max-w-xl flex flex-col items-center">
          <input type="text" placeholder="Use everyday words to describe what your agent should do" className="w-full px-6 py-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
          <button className="mt-2 px-6 py-2 rounded-xl bg-blue-600 text-white font-bold text-base shadow hover:bg-blue-700 transition-colors">Create Agent</button>
        </div>
      </section>

      {/* Explore Agents Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Explore agents</h2>
          <a href="#" className="text-blue-600 hover:underline font-medium">See more</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Example agent cards, replace with dynamic data as needed */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mb-2">
              <span className="text-orange-600 text-2xl">🧠</span>
            </div>
            <h3 className="font-semibold text-lg">Website Q&A</h3>
            <p className="text-slate-600 text-sm">Instantly answer user questions using the content of your website or other knowledge.</p>
            <span className="text-xs text-slate-400">Agent template</span>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-2">
              <span className="text-purple-600 text-2xl">✈️</span>
            </div>
            <h3 className="font-semibold text-lg">Safe Travels</h3>
            <p className="text-slate-600 text-sm">Provides answers to common travel questions and related health and safety guidelines.</p>
            <span className="text-xs text-slate-400">Agent template</span>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
              <span className="text-green-600 text-2xl">💸</span>
            </div>
            <h3 className="font-semibold text-lg">Financial Insights</h3>
            <p className="text-slate-600 text-sm">Help financial services professionals get quick and concise info from their org's financial documents and other available resources.</p>
            <span className="text-xs text-slate-400">Agent template</span>
          </div>
        </div>
      </section>

      {/* Learning Resources Section */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Learning resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <span className="font-medium">Free Jinni Workshop</span>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <span className="font-medium">Documentation</span>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span className="font-medium">Quick start: Use Generative AI in an agent</span>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
