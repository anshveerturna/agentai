'use client';

import { Home, Plus, Users, Share2, Settings, Shield, Wrench } from 'lucide-react';
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
  <aside className="group h-screen w-16 hover:w-64 transition-[width] duration-200 ease-out bg-sidebar border-r border-sidebar-border flex flex-col items-stretch py-4 shadow-lg theme-transition overflow-x-hidden">
      <div className="-mt-2 mb-2 flex items-center w-full h-14 px-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#1F6FEB] to-[#0969DA] rounded-lg p-1 hover-lift theme-transition-transform">
          <div className="w-full h-full bg-sidebar rounded-md flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="28" width="12" height="12" rx="3" fill="#1F6FEB" />
              <rect x="6" y="8" width="12" height="12" rx="3" fill="#1F6FEB" />
              <rect x="26" y="28" width="12" height="12" rx="3" fill="#1F6FEB" />
              <rect x="26" y="8" width="12" height="12" rx="3" fill="#1F6FEB" />
              <rect x="20" y="16" width="3" height="16" rx="1.5" fill="#1F6FEB" />
              <rect x="15" y="21" width="16" height="3" rx="1.5" fill="#1F6FEB" />
            </svg>
          </div>
        </div>
        <span className="ml-3 text-lg font-bold text-sidebar-foreground opacity-0 translate-x-[-8px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap overflow-hidden">
          Jinni
        </span>
      </div>
      <nav className="flex flex-col gap-2 flex-1 px-2">
        {navItems.map(({ name, icon: Icon, href }) => {
          const isActive = pathname === href;
          return (
            <Link key={name} href={href}>
              <div
                className={`group/item flex items-center gap-3 px-3 py-2 rounded-lg hover-lift theme-transition-transform overflow-hidden
                  ${isActive 
                    ? 'bg-sidebar-accent text-sidebar-primary shadow-md scale-105 border border-sidebar-border' 
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`}
              >
                <Icon className={`w-5 h-5 shrink-0 theme-transition ${isActive ? 'text-sidebar-primary' : ''}`} />
                <span className={`text-sm font-medium theme-transition opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto whitespace-nowrap overflow-hidden ${isActive ? 'font-semibold' : ''}`}>
                  {name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
