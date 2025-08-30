// src/app/layout.tsx
import './globals.css';
import { ReactQueryClientProvider } from '@/providers/queryClient';
import { initSessionRefresh } from '@/lib/sessionRefresh';
import { ThemeProvider } from '@/providers/theme';
import { cookies } from 'next/headers'

export const metadata = { title: 'AgentAI - Company' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined') {
    // Initialize once on client
    initSessionRefresh()
  }
  // cookies() typing may vary across Next versions; treat as unknown and access safely
  const cookieStoreUnknown = await cookies() as unknown;
  let theme: 'light' | 'dark' = 'light';
  try {
    const cookieStore = cookieStoreUnknown as { get(name: string): { value?: string } | undefined };
    theme = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';
  } catch {
    theme = 'light';
  }
  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : undefined} suppressHydrationWarning>
      <body className="overflow-x-hidden">
        <ReactQueryClientProvider>
          <ThemeProvider defaultTheme={theme as 'light' | 'dark'}>
            {children}
          </ThemeProvider>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
