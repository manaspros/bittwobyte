"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useSocket } from "./SocketContext";

interface User {
  id: string;
  username: string;
}

interface UserContextType {
  user: User | null;
  setUsername: (username: string) => void;
  isFirstLogin: boolean;
  setIsFirstLogin: (isFirst: boolean) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUsername: () => {},
  isFirstLogin: false,
  setIsFirstLogin: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user: authUser } = useAuth();
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const [user, setUser] = useState<User | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  // Check if user has a username in localStorage
  useEffect(() => {
    if (isAuthenticated && authUser) {
      const savedUsername = localStorage.getItem(`username_${authUser.sub}`);

      if (savedUsername) {
        setUser({
          id: authUser.sub,
          username: savedUsername,
        });

        // If socket is connected, emit authenticated event
        if (socket && isConnected) {
          socket.emit("authenticated", {
            userId: authUser.sub,
            username: savedUsername,
          });
        }
      } else {
        setIsFirstLogin(true);
      }
    }
  }, [isAuthenticated, authUser, socket, isConnected]);

  // Redirect to feed after login or to username setup if first login
  useEffect(() => {
    if (isAuthenticated) {
      if (user && !isFirstLogin) {
        router.push("/feed");
      } else if (isFirstLogin) {
        router.push("/username-setup");
      }
    }
  }, [isAuthenticated, user, isFirstLogin, router]);

  const setUsername = (username: string) => {
    if (authUser) {
      localStorage.setItem(`username_${authUser.sub}`, username);
      setUser({
        id: authUser.sub,
        username,
      });
      setIsFirstLogin(false);

      // Emit authenticated event to socket
      if (socket && isConnected) {
        socket.emit("authenticated", {
          userId: authUser.sub,
          username,
        });
      }
    }
  };

  return (
    <UserContext.Provider
      value={{ user, setUsername, isFirstLogin, setIsFirstLogin }}
    >
      {children}
    </UserContext.Provider>
  );
};
