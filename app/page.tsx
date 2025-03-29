"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaUser, FaUserCheck } from "react-icons/fa";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading, login, logout, user } = useAuth();
  // Add a client-side only state to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true once component mounts on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Add a new effect to cache the Auth0 user for persistent sessions
  useEffect(() => {
    if (isAuthenticated && user) {
      // Store the Auth0 user in localStorage for persistent sessions
      // This helps with reconnections and page refreshes
      localStorage.setItem("auth_user", JSON.stringify(user));
    }
  }, [isAuthenticated, user]);

  // Don't render authentication-dependent UI until client-side
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-4xl font-bold">Welcome to Bit2Byte</h1>
          <p className="text-lg text-muted-foreground">
            A real-time chat application built with Next.js and Socket.io
          </p>
          <div className="flex flex-col space-y-4 pt-4">
            <div className="w-full h-10 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold">Welcome to Bit2Byte</h1>
        <p className="text-lg text-muted-foreground">
          A real-time chat application built with Next.js and Socket.io
        </p>

        <div className="flex flex-col space-y-4 pt-8">
          {isLoading ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Checking authentication status...
              </p>
            </div>
          ) : isAuthenticated ? (
            <>
              <Link href="/chat">
                <Button className="w-full" size="lg">
                  <FaUserCheck className="mr-2" />
                  Go to Chat Rooms
                </Button>
              </Link>
              <Button
                onClick={() => logout()}
                variant="ghost"
                className="w-full"
              >
                Logout
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={() => login()}
                className="w-full"
                size="lg"
                variant="default"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to Auth0...
                  </>
                ) : (
                  <>
                    <FaUser className="mr-2" />
                    Login with Auth0
                  </>
                )}
              </Button>
              <div className="text-sm text-muted-foreground">
                Secure authentication powered by Auth0. Sign in with your email,
                Google, or other social accounts.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
