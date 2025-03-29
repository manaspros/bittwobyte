"use client";

import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  username: string;
}

interface UserListProps {
  users: User[];
  onSelectUser: (user: User) => void;
}

export function UserList({ users, onSelectUser }: UserListProps) {
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No users are currently online
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-4 rounded-md border bg-background hover:bg-accent/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            </div>
            <span className="font-medium">{user.username}</span>
          </div>
          <Button size="sm" onClick={() => onSelectUser(user)}>
            Message
          </Button>
        </div>
      ))}
    </div>
  );
}
