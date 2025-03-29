"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "@/context/SocketContext";
import { Message, User, TypingIndicator } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatRoomProps {
  username: string;
  room: string;
  isPrivate?: boolean;
  recipient?: User;
}

export function ChatRoom({
  username,
  room,
  isPrivate = false,
  recipient,
}: ChatRoomProps) {
  const { socket } = useSocket();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip if socket is not available yet
    if (!socket) return;

    // Reset messages when room changes
    setMessages([]);

    // Join room when component mounts or room changes
    if (!isPrivate) {
      socket.emit("join", { username, room });
    }

    // Listen for message history
    socket.on("messageHistory", (history: Message[]) => {
      setMessages(history);
    });

    // Listen for incoming messages
    socket.on("message", (newMessage: Message) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    // Listen for private messages
    socket.on("privateMessage", (newMessage: Message) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { ...newMessage, isPrivate: true },
      ]);
    });

    // Listen for room users updates
    socket.on("roomUsers", ({ users }: { users: User[] }) => {
      setUsers(users);
    });

    // Listen for typing indicators
    socket.on("userTyping", (typingInfo: TypingIndicator) => {
      if (typingInfo.isTyping) {
        setTypingUsers((prev) => {
          // Add user to typing list if not already there
          if (!prev.some((u) => u.userId === typingInfo.userId)) {
            return [...prev, typingInfo];
          }
          return prev;
        });
      } else {
        setTypingUsers((prev) =>
          prev.filter((user) => user.userId !== typingInfo.userId)
        );
      }
    });

    // Clean up listeners on unmount or room change
    return () => {
      socket.off("messageHistory");
      socket.off("message");
      socket.off("privateMessage");
      socket.off("roomUsers");
      socket.off("userTyping");
    };
  }, [socket, username, room, isPrivate]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim() && socket) {
      if (isPrivate && recipient) {
        socket.emit("sendPrivateMessage", {
          recipientId: recipient.id,
          text: message,
        });
      } else {
        socket.emit("sendMessage", { text: message, room });
      }

      setMessage("");

      // Clear typing indicator
      socket.emit("typing", { room, isTyping: false });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Handle typing indicator
    if (socket) {
      socket.emit("typing", { room, isTyping: true });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { room, isTyping: false });
      }, 2000);
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div
      className={
        isPrivate
          ? ""
          : "grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-80px)]"
      }
    >
      {/* Chat Messages */}
      <div
        className={
          isPrivate ? "w-full" : "col-span-1 lg:col-span-3 flex flex-col h-full"
        }
      >
        {!isPrivate && (
          <div className="mb-4">
            <h2 className="text-xl font-bold">Chat Room: {room}</h2>
          </div>
        )}

        <div className="flex-grow overflow-hidden bg-background border rounded-lg">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-4 p-4">
              {messages.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No messages yet. Send a message to start the conversation!
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg",
                        msg.user === username
                          ? "flex-row-reverse bg-primary/10 ml-auto"
                          : msg.user === "system"
                          ? "justify-center text-center italic text-muted-foreground"
                          : "bg-muted",
                        msg.isPrivate &&
                          "border border-yellow-500/50 bg-yellow-500/10",
                        msg.user === "system" ? "max-w-full" : "max-w-[80%]"
                      )}
                    >
                      {msg.user !== "system" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(msg.user)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex flex-col">
                        {msg.user !== "system" && msg.user !== username && (
                          <span className="text-xs font-medium">
                            {msg.user}
                          </span>
                        )}
                        <p className={msg.user === "system" ? "text-sm" : ""}>
                          {msg.isPrivate && !isPrivate && (
                            <span className="text-xs mr-1 text-yellow-600">
                              [Private]{" "}
                            </span>
                          )}
                          {msg.text}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {typingUsers.length > 0 && (
                <div className="text-sm text-muted-foreground italic">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].username} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </div>
              )}

              <div ref={messageEndRef} />
            </div>
          </ScrollArea>
        </div>

        <div className="mt-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder={`Type your message to ${
                isPrivate ? recipient?.username : "the room"
              }...`}
              className="flex-grow"
            />
            <Button type="submit">Send</Button>
          </form>
        </div>
      </div>

      {/* Online Users - Only show in public chat rooms */}
      {!isPrivate && (
        <div className="col-span-1 h-full">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Online Users ({users.length})</h2>
          </div>
          <div className="bg-background border rounded-lg overflow-hidden h-[calc(100vh-150px)]">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No users in this room
                  </div>
                ) : (
                  <>
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {getInitials(user.username)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500" />
                          </div>
                          <span
                            className={
                              user.username === username ? "font-bold" : ""
                            }
                          >
                            {user.username}{" "}
                            {user.username === username && "(You)"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
