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
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
  Cog,
  X,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useSidebar } from '@/components/layout/SidebarContext';

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pnl', label: 'Profit & Loss', icon: Receipt },
  { href: '/cashflow', label: 'Cash Flow', icon: Banknote },
  { href: '/attribution', label: 'Attribution Tree', icon: GitBranch },
  { href: '/creative', label: 'Creative & MTA', icon: Palette },
  { href: '/cohorts', label: 'Cohort Analysis', icon: Users },
  { href: '/targets', label: 'Targets & Goals', icon: Target },
  { href: '/pdf-export', label: 'PDF Export', icon: Download },
  { href: '/prompt-templates', label: 'Prompt Templates', icon: FileText },
  { href: '/final-items', label: 'Final Items', icon: ChevronRight },
];

const settingsNavItem = { href: '/settings', label: 'Settings', icon: Cog };

export default function Sidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useSidebar();

  const handleNavClick = () => {
    // Close mobile sidebar on nav click
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Link href="/dashboard" className={`flex items-center ${collapsed ? 'lg:justify-center lg:w-full' : ''}`} onClick={handleNavClick}>
          <Image
            src="/andyou-logo.png"
            alt="&you"
            width={collapsed ? 28 : 44}
            height={collapsed ? 28 : 44}
            className={theme === 'dark' ? 'brightness-0 invert' : 'brightness-0'}
            priority
          />
        </Link>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex ml-auto p-1 text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden ml-auto p-1 text-text-tertiary hover:text-text-primary"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto min-h-0">
        {mainNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent/10 text-accent-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {/* On mobile overlay: always show label. On desktop: respect collapsed state */}
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 py-2 px-2 border-t border-border">
        {[settingsNavItem].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent/10 text-accent-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </Link>
          );
        })}
      </div>

    </>
  );

  return (
    <>
      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-over panel */}
          <aside className="absolute left-0 top-0 h-full w-64 glass-panel border-r border-border flex flex-col transition-colors z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Tablet: collapsed (icons only). Desktop: full or collapsed based on state */}
      {/* Hidden on mobile (<1024px), shown on lg+ */}
      <aside className={`hidden lg:flex ${collapsed ? 'w-16' : 'w-56'} shrink-0 h-screen sticky top-0 glass-panel border-r border-border flex-col transition-all duration-200`}>
        {sidebarContent}
      </aside>
    </>
  );
}
