"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Trips", emoji: "✈️", href: "/trips" },
  { label: "Group", emoji: "👥", href: "/group" },
  { label: "Explore", emoji: "🌍", href: "/explore" },
  { label: "Settings", emoji: "⚙️", href: "/settings" },
];

// Paths where the nav should not appear
const EXCLUDED_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/join",
  "/onboarding",
  "/trips/new",
  "/group/traveler",
];

// /trips/[id]/flights, /hotels, /experiences, /checkout, /results, /plan, /preferences
const TRIP_BOOKING_SEGMENTS = new Set([
  "flights", "hotels", "experiences", "checkout", "results", "plan", "preferences",
]);

function shouldShowNav(pathname: string): boolean {
  for (const prefix of EXCLUDED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return false;
  }
  // /trips/[id]/[segment] — exclude booking flow segments
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "trips" && parts.length === 3 && TRIP_BOOKING_SEGMENTS.has(parts[2])) {
    return false;
  }
  return true;
}

export function useShowNav(): boolean {
  const pathname = usePathname();
  return shouldShowNav(pathname);
}

export default function BottomNav() {
  const pathname = usePathname();
  if (!shouldShowNav(pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
      style={{
        background: "var(--cream)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 24px rgba(26,22,18,0.06)",
      }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/trips"
            ? pathname === "/trips" || pathname === "/"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-all active:scale-95"
          >
            <span
              className="transition-all duration-150 leading-none select-none"
              style={{ fontSize: active ? "1.6rem" : "1.25rem" }}
              aria-hidden
            >
              {tab.emoji}
            </span>
            <span
              className="text-xs font-medium transition-all duration-150"
              style={{
                color: active ? "var(--teal)" : "var(--ink-faint)",
                fontFamily: "var(--font-dm-sans)",
                letterSpacing: active ? "0.01em" : "normal",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// Spacer div — renders at normal document flow height to push content above the nav.
// Include this once per page that shows the nav, or use AppShell in layout.
export function NavSpacer() {
  const pathname = usePathname();
  if (!shouldShowNav(pathname)) return null;
  // 64px nav + safe area (approx 34px on iPhone, 0 elsewhere)
  return (
    <div
      aria-hidden
      style={{
        height: "calc(64px + env(safe-area-inset-bottom))",
        flexShrink: 0,
      }}
    />
  );
}
