"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { UserList } from "@/components/chat/UserList";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";

interface User {
  id: string;
  username: string;
}

export default function FeedPage() {
  const { user } = useUser();
  const { socket } = useSocket();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Add a client-side state flag to handle hydration
  const [isClient, setIsClient] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  // Set client state on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && isClient) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router, isClient]);

  // Listen for user list updates
  useEffect(() => {
    if (!socket || !user) return;

    socket.on("userList", (users: User[]) => {
      // Filter out current user
      setOnlineUsers(users.filter((u) => u.id !== user.id));
    });

    socket.on("privateChatJoined", ({ room, withUser }) => {
      setActiveRoom(room);
      setSelectedUser(withUser);
    });

    return () => {
      socket.off("userList");
      socket.off("privateChatJoined");
    };
  }, [socket, user]);

  // Start private chat with a user
  const startPrivateChat = (targetUser: User) => {
    if (!socket || !user) return;

    setSelectedUser(targetUser);
    socket.emit("joinPrivateChat", {
      currentUserId: user.id,
      targetUserId: targetUser.id,
    });
  };

  // Go back to user list
  const backToUserList = () => {
    setSelectedUser(null);
    setActiveRoom(null);
  };

  // Prevent rendering authentication-dependent UI during SSR
  if (!isClient) {
    return (
      <div className="container py-8 text-center">
        <div className="h-8 w-48 bg-gray-200 mx-auto rounded animate-pulse mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  // Show loading state while checking auth or if user not loaded yet
  if (isLoading || !user) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </div>
    );
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome, {user.username}</h1>
        <Button variant="outline" onClick={() => router.push("/chat")}>
          Public Chat
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {!selectedUser ? (
          <>
            <Card className="col-span-1 md:col-span-4">
              <CardHeader>
                <CardTitle>Online Users</CardTitle>
                <CardDescription>
                  Click on a user to start a private chat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserList users={onlineUsers} onSelectUser={startPrivateChat} />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="col-span-1 md:col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Chat with {selectedUser.username}</CardTitle>
                  <CardDescription>Private Chat</CardDescription>
                </div>
                <Button variant="ghost" onClick={backToUserList}>
                  Back to User List
                </Button>
              </CardHeader>
              <CardContent>
                {activeRoom && (
                  <ChatRoom
                    username={user.username}
                    room={activeRoom}
                    isPrivate={true}
                    recipient={selectedUser}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
