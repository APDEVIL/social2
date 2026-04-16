"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Film, PlusSquare, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { useState } from "react";
import { PostCreate } from "@/components/posts/post-create";

const TABS = [
  { href: "/feed",          icon: Home,   label: "Home" },
  { href: "/explore",       icon: Search, label: "Search" },
  { href: "/reels",         icon: Film,   label: "Reels" },
  { href: "/notifications", icon: Bell,   label: "Activity" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [showCreate, setShowCreate] = useState(false);
  const { data: notifCount } = api.notification.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000 },
  );

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-2 pb-safe pt-2">
          {TABS.slice(0, 2).map((tab) => (
            <TabItem
              key={tab.href}
              {...tab}
              isActive={pathname === tab.href}
              badge={tab.href === "/notifications" ? notifCount?.count : undefined}
            />
          ))}

          {/* Center create button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
              style={{ backgroundColor: "hsl(var(--brand))" }}
            >
              <PlusSquare className="h-5 w-5 text-brand-foreground" />
            </span>
          </button>

          {TABS.slice(2).map((tab) => (
            <TabItem
              key={tab.href}
              {...tab}
              isActive={pathname === tab.href}
              badge={tab.href === "/notifications" ? notifCount?.count : undefined}
            />
          ))}
        </div>
      </nav>

      {showCreate && <PostCreate onClose={() => setShowCreate(false)} />}
    </>
  );
}

function TabItem({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center gap-0.5 px-3 py-1"
    >
      <span className="relative">
        <Icon
          className={cn(
            "h-6 w-6 transition-colors",
            isActive ? "text-brand" : "text-muted-foreground",
          )}
          strokeWidth={isActive ? 2.5 : 1.75}
        />
        {badge && badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium",
          isActive ? "text-brand" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      {isActive && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-brand" />
      )}
    </Link>
  );
}