// src/app/layout.tsx
import './globals.css';
import { ReactQueryClientProvider } from '@/providers/queryClient';

export const metadata = { title: 'AgentAI - Company' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
