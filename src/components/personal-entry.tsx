"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import { appendReturnPath } from "@/lib/return-to";

export function PersonalEntry({ children, className }: { children: React.ReactNode; className?: string }) {
  const { status } = useAuth();
  return <Link className={className} href={status === "authenticated" ? "/account/" : appendReturnPath("/login/", "/account/")}>{children}</Link>;
}
