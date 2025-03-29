"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { checkServerStatus } from "@/utils/api";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
  debugInfo: string[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connectionError: null,
  reconnect: () => {},
  debugInfo: [],
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [manualReconnect, setManualReconnect] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => {
      const newDebugInfo = [
        ...prev,
        `${new Date().toISOString().slice(11, 19)}: ${info}`,
      ];
      // Keep only the last 20 messages
      if (newDebugInfo.length > 20) {
        return newDebugInfo.slice(newDebugInfo.length - 20);
      }
      return newDebugInfo;
    });
    console.log(`Socket Debug: ${info}`);
  };

  // Check if server is running before attempting to connect
  useEffect(() => {
    const checkServer = async () => {
      try {
        const isRunning = await checkServerStatus();
        if (!isRunning) {
          setConnectionError("Backend server is not running");
          addDebugInfo("Backend server is not running");
          // Try launching server via our helper script
          if (typeof window !== "undefined") {
            try {
              addDebugInfo("Attempting to start backend server...");
              await fetch("/api/launch-backend");
            } catch (err) {
              addDebugInfo("Could not auto-start backend");
            }
          }
        } else {
          addDebugInfo("Backend server is running");
        }
      } catch (error) {
        console.error("Error checking server status:", error);
        addDebugInfo(
          `Error checking server: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    checkServer();
  }, [manualReconnect]);

  // Initialize socket only on client side
  useEffect(() => {
    // Ensure this code only runs in the browser
    if (typeof window === "undefined") return;

    // Socket.io connection setup with retry logic
    const setupSocket = () => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        addDebugInfo(`Connecting to Socket.IO server at ${backendUrl}`);

        // Initialize socket connection with longer timeout and better retry settings
        const socketInstance = io(backendUrl, {
          timeout: 15000, // 15 seconds
          reconnectionAttempts: 8,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          transports: ["websocket", "polling"], // Try websocket first, then fallback to polling
        });

        // Setup event listeners
        socketInstance.on("connect", () => {
          addDebugInfo("Connected to Socket.io server");
          setIsConnected(true);
          setConnectionError(null);
          setRetryCount(0);
        });

        socketInstance.on("connect_error", (err) => {
          addDebugInfo(`Socket.io connection error: ${err.message}`);
          setConnectionError(`Connection error: ${err.message}`);
          setIsConnected(false);
        });

        socketInstance.on("disconnect", (reason) => {
          addDebugInfo(`Disconnected from Socket.io server: ${reason}`);
          setIsConnected(false);

          if (reason === "io server disconnect") {
            // The server has forcefully disconnected the socket
            addDebugInfo("Attempting to reconnect...");
            socketInstance.connect();
          }
        });

        socketInstance.on("error", (error) => {
          addDebugInfo(
            `Socket error: ${typeof error === "object" ? error.message : error}`
          );
        });

        // Custom debug events
        socketInstance.on("privateChatJoined", (data) => {
          addDebugInfo(
            `Private chat joined: ${data.room} with ${data.withUser.username}`
          );
        });

        // Save socket instance to state
        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
          addDebugInfo("Cleaning up socket connection");
          socketInstance.disconnect();
        };
      } catch (error) {
        console.error("Error setting up socket:", error);
        addDebugInfo(
          `Failed to setup socket: ${
            error instanceof Error ? error.message : String(error)
          }`
        );

        // Retry logic
        if (retryCount < 3) {
          addDebugInfo(`Retrying socket connection (${retryCount + 1}/3)...`);
          setTimeout(() => {
            setRetryCount((prev) => prev + 1);
          }, 5000); // Wait 5 seconds between retries
        }

        return () => {}; // Empty cleanup function
      }
    };

    const cleanup = setupSocket();
    return cleanup;
  }, [retryCount, manualReconnect]);

  useEffect(() => {
    // Skip if socket is not available yet
    if (!socket) return;

    // Set up error handler for auth errors
    socket.on("error", (error) => {
      addDebugInfo(
        `Socket error: ${
          typeof error === "object" ? JSON.stringify(error) : error
        }`
      );

      // Handle auth errors that require login
      if (error.requiresLogin || error.code === "AUTH_ERROR") {
        console.error("Authentication error:", error.message);
        addDebugInfo("Authentication error - redirecting to login");

        // Redirect to home page for login
        if (typeof window !== "undefined") {
          // Clear any auth data
          localStorage.removeItem("auth_user");
          window.location.href = "/";
        }
      }
    });

    // Clean up listener
    return () => {
      socket.off("error");
    };
  }, [socket, addDebugInfo]);

  // Provide a manual reconnect function
  const reconnect = () => {
    addDebugInfo("Manual reconnect requested");
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setManualReconnect((prev) => prev + 1);
  };

  useEffect(() => {
    if (socket) {
      // Set up event listeners for connection status
      socket.on("connect", () => {
        addDebugInfo("Socket connected with ID: " + socket.id);

        // If we've reconnected, try to reauthenticate the user
        // This helps maintain user state after page refreshes or brief disconnections
        const authUser = JSON.parse(
          localStorage.getItem("auth_user") || "null"
        );
        const username = authUser?.sub
          ? localStorage.getItem(`username_${authUser.sub}`)
          : null;

        if (authUser && username) {
          addDebugInfo(`Auto-authenticating user: ${username}`);
          socket.emit("authenticated", {
            userId: authUser.sub,
            username,
            authProvider: "auth0",
            auth0Id: authUser.sub,
            email: authUser.email,
            picture: authUser.picture,
          });
        }
      });

      // Set up error handling for socket reconnection
      socket.io.on("reconnect_attempt", (attempt) => {
        addDebugInfo(`Socket reconnection attempt: ${attempt}`);
      });

      socket.io.on("reconnect", (attempt) => {
        addDebugInfo(`Socket reconnected after ${attempt} attempts`);

        // Reconnect triggers the connect event, which will handle authentication
      });
    }

    return () => {
      if (socket) {
        socket.off("connect");
        socket.io.off("reconnect_attempt");
        socket.io.off("reconnect");
      }
    };
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, connectionError, reconnect, debugInfo }}
    >
      {children}
    </SocketContext.Provider>
  );
};
