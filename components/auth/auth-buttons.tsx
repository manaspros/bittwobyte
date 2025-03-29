"use client";

import { useAuth0 } from "@auth0/auth0-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center gap-4">
      {!isAuthenticated && (
        <Button 
          onClick={() => loginWithRedirect()}
          variant="default"
        >
          Log In
        </Button>
      )}
      
      {isAuthenticated && user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user.picture && (
              <Image 
                src={user.picture}
                alt={user.name || "User"}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="text-sm font-medium">{user.name}</span>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => logout({ returnTo: window.location.origin })}
          >
            Log Out
          </Button>

          <Link href="/profile">
            <Button variant="ghost" size="sm">Profile</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
