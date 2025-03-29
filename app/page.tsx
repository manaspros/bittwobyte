"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const { isAuthenticated, login, logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold">Welcome to Bit2Byte</h1>
        <p className="text-lg text-muted-foreground">
          A real-time chat application built with Next.js and Socket.io
        </p>

        <div className="flex flex-col space-y-4 pt-4">
          {isAuthenticated ? (
            <>
              <Link href="/feed">
                <Button className="w-full" size="lg">
                  Go to Feed
                </Button>
              </Link>
              <Link href="/chat">
                <Button className="w-full" variant="outline" size="lg">
                  Public Chat Rooms
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
            <Button onClick={() => login()} className="w-full" size="lg">
              Login to Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
