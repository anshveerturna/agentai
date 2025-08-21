
import { DashboardLayout } from '../components/layout/DashboardLayout';
import AgentList from '../components/AgentList';
import { CreateAgentDialog } from '../components/CreateAgentDialog';

export default function HomePage() {
  return (
    <DashboardLayout>
      {/* Hero Section */}
      <section className="w-full flex flex-col items-center justify-center py-12 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl mb-8 shadow-md">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4 text-center">Describe your agent to create it</h1>
        <div className="flex gap-4 mb-6">
          <button className="px-6 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/80 theme-transition">Helpdesk</button>
          <button className="px-6 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/80 theme-transition">Expense tracking</button>
          <button className="px-6 py-2 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent/80 theme-transition">HR and benefits</button>
        </div>
        <div className="w-full max-w-xl flex flex-col items-center">
          <input type="text" placeholder="Use everyday words to describe what your agent should do" className="w-full px-6 py-4 rounded-xl border border-border bg-background text-foreground text-lg shadow focus:outline-none focus:ring-2 focus:ring-ring mb-2 theme-transition" />
          <button className="mt-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow hover:bg-primary/90 theme-transition">Create Agent</button>
        </div>
      </section>

      {/* Explore Agents Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Explore agents</h2>
          <a href="#" className="text-primary hover:text-primary/80 font-medium theme-transition">See more</a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Example agent cards, replace with dynamic data as needed */}
          <div className="bg-card rounded-xl shadow p-6 border border-border flex flex-col gap-2 hover:shadow-lg theme-transition">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-2">
              <span className="text-orange-600 dark:text-orange-400 text-2xl">🧠</span>
            </div>
            <h3 className="font-semibold text-lg text-card-foreground">Website Q&A</h3>
            <p className="text-muted-foreground text-sm">Instantly answer user questions using the content of your website or other knowledge.</p>
            <span className="text-xs text-muted-foreground">Agent template</span>
          </div>
          <div className="bg-card rounded-xl shadow p-6 border border-border flex flex-col gap-2 hover:shadow-lg theme-transition">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2">
              <span className="text-purple-600 dark:text-purple-400 text-2xl">✈️</span>
            </div>
            <h3 className="font-semibold text-lg text-card-foreground">Safe Travels</h3>
            <p className="text-muted-foreground text-sm">Provides answers to common travel questions and related health and safety guidelines.</p>
            <span className="text-xs text-muted-foreground">Agent template</span>
          </div>
          <div className="bg-card rounded-xl shadow p-6 border border-border flex flex-col gap-2 hover:shadow-lg theme-transition">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
              <span className="text-green-600 dark:text-green-400 text-2xl">💸</span>
            </div>
            <h3 className="font-semibold text-lg text-card-foreground">Financial Insights</h3>
            <p className="text-muted-foreground text-sm">Help financial services professionals get quick and concise info from their org's financial documents and other available resources.</p>
            <span className="text-xs text-muted-foreground">Agent template</span>
          </div>
        </div>
      </section>

      {/* Learning Resources Section */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Learning resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl shadow p-4 border border-border flex items-center gap-3 hover:shadow-lg theme-transition">
            <span className="text-2xl">📚</span>
            <span className="font-medium text-card-foreground">Free Jinni Workshop</span>
          </div>
          <div className="bg-card rounded-xl shadow p-4 border border-border flex items-center gap-3 hover:shadow-lg theme-transition">
            <span className="text-2xl">📄</span>
            <span className="font-medium text-card-foreground">Documentation</span>
          </div>
          <div className="bg-card rounded-xl shadow p-4 border border-border flex items-center gap-3 hover:shadow-lg theme-transition">
            <span className="text-2xl">⚡</span>
            <span className="font-medium text-card-foreground">Quick start: Use Generative AI in an agent</span>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
