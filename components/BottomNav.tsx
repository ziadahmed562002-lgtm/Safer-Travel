"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TABS = [
  { label: "Trips",    emoji: "✈️",  href: "/trips" },
  { label: "Group",    emoji: "👥",  href: "/group" },
  { label: "Explore",  emoji: "🌍",  href: "/explore" },
  { label: "Settings", emoji: "⚙️",  href: "/settings" },
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
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "trips" && parts.length === 3 && TRIP_BOOKING_SEGMENTS.has(parts[2])) {
    return false;
  }
  return true;
}

function getActiveIndex(pathname: string): number {
  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    if (tab.href === "/trips") {
      if (pathname === "/trips" || pathname.startsWith("/trips")) return i;
    } else {
      if (pathname.startsWith(tab.href)) return i;
    }
  }
  return 0;
}

export function useShowNav(): boolean {
  const pathname = usePathname();
  return shouldShowNav(pathname);
}

export default function BottomNav() {
  const pathname = usePathname();
  if (!shouldShowNav(pathname)) return null;

  return <BottomNavInner pathname={pathname} />;
}

function BottomNavInner({ pathname }: { pathname: string }) {
  const activeIndex = getActiveIndex(pathname);
  const [bouncingIndex, setBouncingIndex] = useState<number | null>(null);
  const prevIndex = useRef(activeIndex);

  // Trigger bounce when active tab changes
  useEffect(() => {
    if (prevIndex.current !== activeIndex) {
      setBouncingIndex(activeIndex);
      prevIndex.current = activeIndex;
      const t = setTimeout(() => setBouncingIndex(null), 400);
      return () => clearTimeout(t);
    }
  }, [activeIndex]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "var(--cream)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 24px rgba(26,22,18,0.07)",
      }}
    >
      {/* Sliding pill background */}
      <div className="relative flex items-stretch">
        {/* Pill */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 6,
            height: "calc(100% - 12px)",
            width: "calc(25% - 12px)",
            borderRadius: 14,
            background: "rgba(46,125,107,0.09)",
            transform: `translateX(calc(${activeIndex} * 100% + ${activeIndex * 4 + 6}px))`,
            transition: "transform 0.3s cubic-bezier(0.34,1.2,0.64,1)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative z-10 active:scale-90 transition-transform"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span
                className={bouncingIndex === i ? "tab-bounce" : ""}
                style={{
                  fontSize: active ? "1.55rem" : "1.25rem",
                  lineHeight: 1,
                  display: "block",
                  transition: "font-size 0.2s ease",
                  userSelect: "none",
                }}
                aria-hidden
              >
                {tab.emoji}
              </span>
              <span
                className="text-xs font-medium"
                style={{
                  color: active ? "var(--teal)" : "var(--ink-faint)",
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: active ? 600 : 400,
                  transition: "color 0.2s ease, font-weight 0.2s ease",
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function NavSpacer() {
  const pathname = usePathname();
  if (!shouldShowNav(pathname)) return null;
  return (
    <div
      aria-hidden
      style={{ height: "calc(64px + env(safe-area-inset-bottom))", flexShrink: 0 }}
    />
  );
}
