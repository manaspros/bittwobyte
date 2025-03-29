import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SocketProvider } from "@/context/SocketContext";
import { UserProvider } from "@/context/UserContext";
import { ConnectionStatusBar } from "@/components/ConnectionStatusBar";
import { DebugPanel } from "@/components/DebugPanel";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Bit2Byte Chat",
  description: "Real-time chat application with Next.js and Socket.io",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <SocketProvider>
              <UserProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                </div>
                <ConnectionStatusBar />
                <DebugPanel />
              </UserProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
