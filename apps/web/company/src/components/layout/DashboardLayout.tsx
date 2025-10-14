"use client";
import { Sidebar } from './Sidebar';
import { Header } from './Header';

type DashboardLayoutProps = {
  children: React.ReactNode;
  /**
   * When true, removes the inner max-width container and default paddings
   * so pages (like the Flow Builder) can use full available screen width/height.
   */
  fullBleed?: boolean; // default: false
  /**
   * Optional extra classes for the <main> element.
   */
  contentClassName?: string;
  /**
   * Hide the global header (builder pages will render their own header bar)
   */
  hideHeader?: boolean;
};

  export function DashboardLayout({ children, fullBleed = false, contentClassName, hideHeader = false }: DashboardLayoutProps) {
    // Only apply default paddings when fullBleed layout is not enabled
    const defaultPadding = fullBleed ? '' : 'px-8 py-6';

  return (
    <div className="flex h-screen bg-background overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-x-hidden">
  {!hideHeader && <Header />}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden bg-background ${defaultPadding} ${contentClassName ?? ''}`}>
            {fullBleed ? (
              children
            ) : (
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            )}
        </main>
      </div>
    </div>
  );
}
