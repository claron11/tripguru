"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Compass, LayoutDashboard, LogOut, LogIn, Map } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand" id="navbar-brand">
        <Compass size={22} />
        <span>TripGuru</span>
      </Link>

      <div className="navbar-actions">
        <ThemeToggle />
        {status === "authenticated" ? (
          <>
            <Link
              href="/plan-trip"
              className={`btn btn-sm ${pathname === "/plan-trip" ? "btn-primary" : "btn-ghost"}`}
              id="navbar-plan-trip"
            >
              <Map size={14} />
              Plan Trip
            </Link>
            <Link
              href="/dashboard"
              className={`btn btn-sm ${pathname === "/dashboard" ? "btn-primary" : "btn-ghost"}`}
              id="navbar-dashboard"
            >
              <LayoutDashboard size={14} />
              Saved Trips
            </Link>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => signOut({ callbackUrl: "/" })}
              id="navbar-signout"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-sm btn-ghost" id="navbar-login">
              <LogIn size={14} />
              Sign In
            </Link>
            <Link href="/register" className="btn btn-sm btn-primary" id="navbar-register">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
