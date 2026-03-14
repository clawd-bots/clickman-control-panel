'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Banknote,
  GitBranch,
  Palette,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pnl', label: 'Profit & Loss', icon: Receipt },
  { href: '/cashflow', label: 'Cash Flow', icon: Banknote },
  { href: '/attribution', label: 'Attribution Tree', icon: GitBranch },
  { href: '/creative', label: 'Creative & MTA', icon: Palette },
  { href: '/cohorts', label: 'Cohort Analysis', icon: Users },
  { href: '/targets', label: 'Targets & Goals', icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-56'} shrink-0 h-screen sticky top-0 bg-bg-surface border-r border-border flex flex-col transition-all duration-200 transition-colors`}>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Link href="/dashboard" className={`flex items-center ${collapsed ? 'justify-center w-full' : ''}`}>
          <Image
            src="/andyou-logo.png"
            alt="&you"
            width={collapsed ? 28 : 44}
            height={collapsed ? 28 : 44}
            className={theme === 'dark' ? 'brightness-0 invert' : ''}
            priority
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-blue/15 text-brand-blue-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-border text-text-tertiary hover:text-text-secondary transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
