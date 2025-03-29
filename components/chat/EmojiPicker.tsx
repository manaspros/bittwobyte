"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  // Common emoji reactions
  const commonEmojis = [
    "👍",
    "❤️",
    "😂",
    "😮",
    "😢",
    "😡",
    "🎉",
    "👏",
    "🙌",
    "🔥",
    "💯",
    "✅",
    "❌",
    "🤔",
    "👀",
    "💪",
  ];

  return (
    <div className="grid grid-cols-8 gap-1 p-1">
      {commonEmojis.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md hover:bg-muted"
          onClick={() => onEmojiSelect(emoji)}
        >
          <span className="text-lg">{emoji}</span>
        </Button>
      ))}
    </div>
  );
}
