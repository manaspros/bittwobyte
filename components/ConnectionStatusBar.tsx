"use client";

import { useSocket } from "@/context/SocketContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export function ConnectionStatusBar() {
  const { isConnected, connectionError, reconnect } = useSocket();
  const [isServerRunning, setIsServerRunning] = useState<boolean | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Check if the server is running
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const response = await fetch(`${backendUrl}/api/health`, {
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        setIsServerRunning(response.ok);
      } catch (error) {
        console.error("Error checking server status:", error);
        setIsServerRunning(false);
      }
    };

    checkServerStatus();

    // Periodically check server status if not connected
    const intervalId = !isConnected
      ? setInterval(checkServerStatus, 10000)
      : null;

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isConnected]);

  const handleReconnect = async () => {
    setIsReconnecting(true);

    // Try to start the backend server
    try {
      await fetch("/api/launch-backend");
    } catch (error) {
      console.error("Failed to start backend server:", error);
    }

    // Wait a moment before reconnecting
    setTimeout(() => {
      reconnect();
      setIsReconnecting(false);
    }, 2000);
  };

  if (isConnected && !connectionError && isServerRunning) {
    return null; // All good, don't show anything
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className="bg-yellow-50 border-yellow-500">
        <div className="flex flex-col gap-2">
          <AlertTitle className="text-yellow-700">
            {!isServerRunning
              ? "Server Connection Issue"
              : connectionError
              ? "Socket Connection Error"
              : "Connection Status"}
          </AlertTitle>
          <AlertDescription className="text-yellow-600">
            {!isServerRunning ? (
              <span>
                The backend server appears to be offline. Make sure it's running
                at{" "}
                <code className="bg-yellow-100 px-1 rounded">
                  {process.env.NEXT_PUBLIC_BACKEND_URL ||
                    "http://localhost:5000"}
                </code>
              </span>
            ) : connectionError ? (
              <span>{connectionError}</span>
            ) : (
              <span>Attempting to connect to the server...</span>
            )}
          </AlertDescription>

          <div className="flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                onClick={handleReconnect}
                disabled={isReconnecting}
              >
                {isReconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconnecting...
                  </>
                ) : (
                  "Try Reconnect"
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                onClick={() => setShowHelp(!showHelp)}
              >
                {showHelp ? "Hide Help" : "Show Help"}
              </Button>
            </div>

            {showHelp && (
              <div className="text-xs mt-2 text-yellow-700 bg-yellow-100 p-2 rounded">
                <p className="font-semibold mb-1">How to start the server:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Open a terminal in your project root</li>
                  <li>
                    Run{" "}
                    <code className="bg-white px-1 rounded">
                      npm run server
                    </code>{" "}
                    to start the backend
                  </li>
                  <li>
                    Make sure port 5000 is not in use by another application
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
}
