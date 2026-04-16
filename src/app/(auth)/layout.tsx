import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Sign in",
    template: "%s · GoBuzz",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center relative overflow-hidden bg-[hsl(43,96%,56%)]">
      {/* Layered gold bg with noise texture feel */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, hsl(43,96%,70%) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, hsl(35,100%,60%) 0%, transparent 50%),
            radial-gradient(ellipse at 60% 80%, hsl(48,96%,45%) 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating decorative circles */}
      <div className="absolute top-8 left-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute bottom-12 right-12 w-40 h-40 rounded-full bg-black/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-white/15 blur-xl" />

      {/* Card container */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">{children}</div>
    </div>
  );
}