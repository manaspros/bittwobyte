"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { UserList } from "@/components/chat/UserList";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/components/auth/auth-provider";
import { useSocket } from "@/context/SocketContext";
import { fetchAllUsers } from "@/utils/api";
import { User } from "@/types/chat";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const { user: contextUser } = useUser();
  const { isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("general");
  const [customRoom, setCustomRoom] = useState("");
  const [showCustomRoom, setShowCustomRoom] = useState(false);
  const [joined, setJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auto-populate username and join general room if user is authenticated
  useEffect(() => {
    if (isAuthenticated && contextUser && contextUser.username) {
      setUsername(contextUser.username);

      // Auto-join room for users coming from other pages
      const urlParams = new URLSearchParams(window.location.search);
      const autoJoin = urlParams.get("autoJoin");
      if (autoJoin === "true") {
        setJoined(true);
      }
    }
  }, [isAuthenticated, contextUser]);

  // Listen for user list updates
  useEffect(() => {
    if (!socket || !contextUser) return;

    socket.on("userList", (users: User[]) => {
      // Filter out current user
      const filteredUsers = users.filter((u) => u.id !== contextUser.id);
      console.log(`Received updated user list: ${filteredUsers.length} users`);
      setOnlineUsers(filteredUsers);
    });

    socket.on("privateChatJoined", ({ room, withUser }) => {
      console.log(`Joined private chat room: ${room} with user:`, withUser);
      setActiveRoom(room);
      setSelectedUser(withUser);
      setActiveTab("private");
    });

    return () => {
      socket.off("userList");
      socket.off("privateChatJoined");
    };
  }, [socket, contextUser]);

  // Fetch all users when tab switches to private
  useEffect(() => {
    if (activeTab === "private" && contextUser && isClient) {
      loadAllUsers();
    }
  }, [activeTab, contextUser, isClient]);

  // Load all users
  const loadAllUsers = async () => {
    if (!contextUser) return;

    try {
      setIsLoadingUsers(true);
      const users = await fetchAllUsers();
      if (Array.isArray(users)) {
        setAllUsers(users.filter((u) => u.id !== contextUser.id));
      } else {
        console.error("Unexpected response format from fetchAllUsers:", users);
        setAllUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setAllUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Start private chat with a user
  const startPrivateChat = (targetUser: User) => {
    if (!socket || !contextUser) return;

    console.log("Starting private chat with:", targetUser);

    // Set loading or pending state
    setSelectedUser(targetUser);

    if (socket.connected) {
      console.log(
        `Emitting joinPrivateChat with currentUserId: ${contextUser.id}`
      );

      socket.emit("joinPrivateChat", {
        currentUserId: contextUser.id,
        targetUserId: targetUser.id,
      });
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    const finalRoom = showCustomRoom ? customRoom : room;
    if (finalRoom) {
      setJoined(true);
      setActiveTab("public");
    }
  };

  // Return to room selection
  const handleLeaveRoom = () => {
    setJoined(false);
    setSelectedUser(null);
    setActiveRoom(null);
  };

  if (!joined) {
    return (
      <div className="container flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join a Chat Room</CardTitle>
            <CardDescription>
              Enter your username and select a room to start chatting
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleJoinRoom}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={!!contextUser}
                />
                {contextUser && (
                  <p className="text-xs text-muted-foreground">
                    Using your account username
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Room</Label>
                {!showCustomRoom ? (
                  <Select value={room} onValueChange={setRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Enter custom room name"
                    value={customRoom}
                    onChange={(e) => setCustomRoom(e.target.value)}
                    required
                  />
                )}

                <Button
                  type="button"
                  variant="link"
                  className="px-0"
                  onClick={() => {
                    setShowCustomRoom(!showCustomRoom);
                    if (showCustomRoom) {
                      setRoom("general");
                    } else {
                      setCustomRoom("");
                    }
                  }}
                >
                  {showCustomRoom
                    ? "Use a predefined room"
                    : "Create a custom room"}
                </Button>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full">
                Join Room
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome, {username}</h1>
        <Button variant="outline" onClick={handleLeaveRoom}>
          Change Room
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="public">Public Chat</TabsTrigger>
          <TabsTrigger value="private">Private Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="mt-0">
          <ChatRoom
            username={username}
            room={showCustomRoom ? customRoom : room}
          />
        </TabsContent>

        <TabsContent value="private" className="mt-0">
          {selectedUser && activeRoom ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Chat with {selectedUser.username}</CardTitle>
                  <CardDescription>Private Chat</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedUser(null);
                    setActiveRoom(null);
                  }}
                >
                  Back to User List
                </Button>
              </CardHeader>
              <CardContent>
                <ChatRoom
                  username={username}
                  room={activeRoom}
                  isPrivate={true}
                  recipient={selectedUser}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Private Messages</CardTitle>
                <CardDescription>
                  Select a user to start a private conversation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">
                        Online Users ({onlineUsers.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadAllUsers}
                        disabled={isLoadingUsers}
                      >
                        Refresh
                      </Button>
                    </div>
                    <UserList
                      users={onlineUsers}
                      onSelectUser={startPrivateChat}
                    />

                    {onlineUsers.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No users currently online
                      </div>
                    )}

                    <h3 className="text-lg font-medium mt-8">
                      All Users ({allUsers.length})
                    </h3>
                    <UserList
                      users={allUsers}
                      onSelectUser={startPrivateChat}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
