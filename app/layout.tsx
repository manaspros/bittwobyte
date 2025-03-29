import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import NavigationWrapper from '@/components/NavigationWrapper';

export const metadata: Metadata = {
  title: 'Bit2Byte',
  description: 'Video calling app with Agora and Auth0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <NavigationWrapper />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
