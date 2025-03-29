"use client"

import HeroGeometric from "../components/kokonutui/hero-geometric"
import { AuthButtons } from "@/components/auth/auth-buttons"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SyntheticV0PageForDeployment() {
  return (
    <div className="container mx-auto py-4">
      <div className="flex justify-end mb-4">
        <AuthButtons />
      </div>
      
      <HeroGeometric />
      
      <div className="flex gap-4 justify-center mt-6">
        <Link href="/protected">
          <Button>Protected Page</Button>
        </Link>
        <Link href="/profile">
          <Button variant="outline">Your Profile</Button>
        </Link>
      </div>
    </div>
  )
}