import type { Metadata } from 'next';
import './globals.css';
import { UserProvider } from '@/lib/userContext';
import { NotificationsProvider } from '@/lib/notificationsContext';
import { TaskModalProvider } from '@/lib/taskModalContext';
import NavBar from '@/components/ui/NavBar';
import NotificationsSidebar from '@/components/ui/NotificationsSidebar';

export const metadata: Metadata = {
  title: 'מערכת ניהול פרויקטים',
  description: 'רב-צוותית',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-white min-h-screen flex flex-col antialiased">
        <UserProvider>
          <NotificationsProvider>
            <TaskModalProvider>
              <NavBar />
              <main className="flex-1 flex flex-col overflow-hidden">
                {children}
              </main>
              <NotificationsSidebar />
            </TaskModalProvider>
          </NotificationsProvider>
        </UserProvider>
      </body>
    </html>
  );
}
