import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';


import ThemeProvider from '@/components/ThemeProvider';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { DateProvider } from '@/components/DateProvider';
import ActivityLogger from '@/components/ActivityLogger';

export const metadata: Metadata = {
  title: 'Click-Man Control Panel | &you',
  description: 'Marketing & Financial Dashboard for AndYou.ph',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <CurrencyProvider>
            <DateProvider>
              <SidebarProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  <TopBar />
                  <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
                    <div className="w-full max-w-7xl mx-auto">
                      {children}
                    </div>
                  </main>
                </div>
              </div>

              <ActivityLogger />
              </SidebarProvider>
            </DateProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
