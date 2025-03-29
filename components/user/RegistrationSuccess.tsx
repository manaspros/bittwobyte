"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight } from "lucide-react";

interface RegistrationSuccessProps {
  username: string;
  onComplete: () => void;
}

export function RegistrationSuccess({
  username,
  onComplete,
}: RegistrationSuccessProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [countdown, setCountdown] = useState(5);

  // Auto-redirect after countdown
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        setIsOpen(false);
        onComplete();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isOpen, onComplete]);

  const handleComplete = () => {
    setIsOpen(false);
    onComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-center">
            Registration Complete
          </DialogTitle>
          <DialogDescription className="text-center">
            Welcome to Bit2Byte, <strong>{username}</strong>! Your account has
            been successfully created.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-center">
          <p>
            You'll be redirected to chat in {countdown} seconds, or you can
            continue now.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
          <Button onClick={handleComplete} className="w-full sm:w-auto">
            Continue to Chat <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
