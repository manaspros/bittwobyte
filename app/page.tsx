"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { FaComments, FaUserFriends, FaLock, FaCode } from "react-icons/fa";
import HeroGeometric from "@/components/hero/HeroGeometric";

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Handle client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  return <HeroGeometric />;
}
