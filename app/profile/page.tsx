"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useAuth0();

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        
        {user && (
          <div className="bg-card p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              {user.picture && (
                <Image 
                  src={user.picture}
                  alt={user.name || "User"} 
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              )}
              
              <div>
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                
                <div className="mt-6 p-4 bg-muted rounded-md max-w-xl overflow-auto">
                  <pre className="text-xs">{JSON.stringify(user, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </ProtectedRoute>
  );
}
