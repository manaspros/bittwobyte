"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ChatRoom } from "@/components/chat/ChatRoom";
import { SocketProvider } from "@/context/SocketContext";

export default function ChatPage() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("general");
  const [customRoom, setCustomRoom] = useState("");
  const [showCustomRoom, setShowCustomRoom] = useState(false);
  const [joined, setJoined] = useState(false);
  const router = useRouter();

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    const finalRoom = showCustomRoom ? customRoom : room;
    if (finalRoom) {
      setJoined(true);
    }
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
                />
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
    <SocketProvider>
      <div className="container py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Welcome, {username}</h1>
          <Button variant="outline" onClick={() => setJoined(false)}>
            Leave Room
          </Button>
        </div>

        <ChatRoom
          username={username}
          room={showCustomRoom ? customRoom : room}
        />
      </div>
    </SocketProvider>
  );
}
