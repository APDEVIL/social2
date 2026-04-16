"use client";

import { cn } from "@/lib/utils";

interface BuzzLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-2xl" },
  lg: { icon: 44, text: "text-3xl" },
  xl: { icon: 64, text: "text-5xl" },
};

export function BuzzLogo({
  size = "md",
  variant = "full",
  className,
}: BuzzLogoProps) {
  const { icon, text } = sizes[size];

  const Icon = () => (
    <svg
      width={icon}
      height={icon}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Speech bubble */}
      <path
        d="M4 8C4 5.79086 5.79086 4 8 4H36C38.2091 4 40 5.79086 40 8V28C40 30.2091 38.2091 32 36 32H24L16 40V32H8C5.79086 32 4 30.2091 4 28V8Z"
        fill="hsl(43, 96%, 56%)"
      />
      {/* Buzz lines / lightning */}
      <path
        d="M24 10L18 22H23L19 34L30 18H24L28 10H24Z"
        fill="#0a0a0a"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === "icon") {
    return (
      <div className={cn("flex items-center", className)}>
        <Icon />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={cn("flex items-center", className)}>
        <span
          className={cn(
            "font-black tracking-tighter leading-none",
            text
          )}
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <span className="text-[hsl(43,96%,56%)]">Go</span>
          <span className="text-foreground">Buzz</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon />
      <span
        className={cn("font-black tracking-tighter leading-none", text)}
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        <span className="text-[hsl(43,96%,56%)]">Go</span>
        <span className="text-foreground">Buzz</span>
      </span>
    </div>
  );
}