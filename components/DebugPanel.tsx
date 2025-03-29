"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/context/SocketContext";
import { Loader2, Bug } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/components/auth/auth-provider";

export function DebugPanel() {
  const { debugInfo, reconnect } = useSocket();
  const { user } = useUser();
  const { isAuthenticated, user: authUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showAuthInfo, setShowAuthInfo] = useState(false);

  const handleReconnect = () => {
    setIsReconnecting(true);
    reconnect();
    setTimeout(() => setIsReconnecting(false), 2000);
  };

  if (!isOpen) {
    return (
      <Button
        size="icon"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 rounded-full h-10 w-10"
      >
        <Bug className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[400px] max-w-[calc(100vw-2rem)] bg-background border rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="font-medium">Socket Debug Panel</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReconnect}
            disabled={isReconnecting}
          >
            {isReconnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Reconnecting
              </>
            ) : (
              "Reconnect"
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAuthInfo(!showAuthInfo)}
          >
            {showAuthInfo ? "Hide Auth" : "Auth Info"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </div>

      {showAuthInfo && (
        <div className="p-2 border-b text-xs">
          <div className="font-bold mb-1">Authentication Info:</div>
          <div>
            Auth Status:{" "}
            {isAuthenticated ? "Authenticated" : "Not Authenticated"}
          </div>
          {user && (
            <div>
              <div>User Context:</div>
              <pre className="bg-muted p-1 mt-1 overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          )}
          {authUser && (
            <div className="mt-1">
              <div>Auth User:</div>
              <pre className="bg-muted p-1 mt-1 overflow-x-auto">
                {JSON.stringify(authUser, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="p-2 max-h-[300px] overflow-y-auto">
        <div className="space-y-1 text-xs font-mono">
          {debugInfo.length === 0 ? (
            <div className="text-muted-foreground">No events yet</div>
          ) : (
            debugInfo.map((item, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
