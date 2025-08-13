'use client';

import { Home, Plus, Users, Share2, Settings, Shield, Wrench, Grid } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Home', icon: Home, href: '/' },
  { name: 'Create', icon: Plus, href: '/create' },
  { name: 'Agents', icon: Users, href: '/agents' },
  { name: 'Flows', icon: Share2, href: '/flows' },
  { name: 'Tools', icon: Wrench, href: '/tools' },
  { name: 'Settings', icon: Settings, href: '/settings' },
  { name: 'Security', icon: Shield, href: '/security' },
];  

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-6 shadow-lg">
      <div className="-mt-5 mb-2 flex items-center justify-center w-full h-16">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="28" width="12" height="12" rx="3" fill="#2563eb" />
          <rect x="6" y="8" width="12" height="12" rx="3" fill="#2563eb" />
          <rect x="26" y="28" width="12" height="12" rx="3" fill="#2563eb" />
          <rect x="26" y="8" width="12" height="12" rx="3" fill="#2563eb" />
          <rect x="20" y="16" width="3" height="16" rx="1.5" fill="#2563eb" />
          <rect x="15" y="21" width="16" height="3" rx="1.5" fill="#2563eb" />
        </svg>
      </div>
      <nav className="flex flex-col gap-6 flex-1">
        {navItems.map(({ name, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <Link key={name} href={href}>
              <div
                className={`group flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200
                  ${isActive ? 'bg-blue-50 text-blue-600 font-bold shadow-md scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 hover:bg-slate-100 dark:hover:bg-slate-800'}
                  active:scale-95 active:shadow-sm cursor-pointer`}
                style={{ outline: isActive ? '2px solid #2563eb' : 'none', outlineOffset: isActive ? '2px' : '0' }}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : ''}`} />
                <span className={`text-xs font-medium ${isActive ? 'font-bold' : ''}`}>{name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
