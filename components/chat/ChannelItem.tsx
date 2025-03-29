"use client";

import { cn } from "@/lib/utils";

interface ChannelItemProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
}

export function ChannelItem({ name, isActive, onClick }: ChannelItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50",
        isActive && "bg-accent/70 text-accent-foreground"
      )}
      onClick={onClick}
    >
      <span className="text-muted-foreground">#</span>
      <span>{name}</span>
    </div>
  );
}
