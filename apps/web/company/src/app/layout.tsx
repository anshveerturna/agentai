// src/app/layout.tsx
import './globals.css';
import { ReactQueryClientProvider } from '@/providers/queryClient';
import { initSessionRefresh } from '@/lib/sessionRefresh';

export const metadata = { title: 'AgentAI - Company' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined') {
    // Initialize once on client
    initSessionRefresh()
  }
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <ReactQueryClientProvider>
          {children}
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
