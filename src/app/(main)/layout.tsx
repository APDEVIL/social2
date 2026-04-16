import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth/server";
import { LeftRail } from "@/components/layout/left-rail";
import { RightNav } from "@/components/layout/right-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex min-h-dvh w-full">
        {/* Left: Stories rail — hidden on mobile */}
        <div className="hidden md:block">
          <LeftRail />
        </div>

        {/* Center: scrollable content */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Right: Icon nav — hidden on mobile */}
        <div className="hidden md:block">
          <RightNav />
        </div>

        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </TooltipProvider>
  );
}