import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AuthGate } from '../auth/AuthGate';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-x-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-6 bg-background">
          <AuthGate loadingFallback={<div className="text-muted-foreground p-8">Checking session...</div>}>
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </AuthGate>
        </main>
      </div>
    </div>
  );
}
