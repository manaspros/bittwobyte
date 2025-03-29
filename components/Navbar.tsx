"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { useState } from "react";
import { MoonIcon, SunIcon, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export function Navbar() {
  const { isAuthenticated, logout, login, user: authUser } = useAuth();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col gap-6 pr-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">Bit2Byte</span>
              </div>
              <div className="flex flex-col gap-2">
                <SheetClose asChild>
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-start">
                      Home
                    </Button>
                  </Link>
                </SheetClose>
                {isAuthenticated && (
                  <SheetClose asChild>
                    <Link href="/chat">
                      <Button variant="ghost" className="w-full justify-start">
                        Chat Rooms
                      </Button>
                    </Link>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2">
            <span className="hidden font-bold md:inline-block">Bit2Byte</span>
          </Link>

          <nav className="hidden gap-2 md:flex">
            {isAuthenticated && (
              <Link href="/chat">
                <Button variant="ghost">Chat Rooms</Button>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {isAuthenticated ? (
            <Button variant="ghost" onClick={() => logout()}>
              Logout
            </Button>
          ) : (
            <Button onClick={() => login()}>Login</Button>
          )}
        </div>
      </div>
    </header>
  );
}
