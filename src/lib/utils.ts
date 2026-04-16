import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNowStrict } from "date-fns";

// ─── Tailwind class merger ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Time formatting ──────────────────────────────────────────────────────────
export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const distance = formatDistanceToNowStrict(d, { addSuffix: false });

  // Compact format: "2 hours ago" → "2h", "3 minutes" → "3m", etc.
  return distance
    .replace(" seconds", "s")
    .replace(" second", "s")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace(" weeks", "w")
    .replace(" week", "w")
    .replace(" months", "mo")
    .replace(" month", "mo")
    .replace(" years", "y")
    .replace(" year", "y");
}

// Full human-readable: "2 hours ago"
export function formatTimeAgoFull(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

// ─── Count formatting ─────────────────────────────────────────────────────────
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}K`;
  return n.toString();
}

// ─── String helpers ───────────────────────────────────────────────────────────

// Extract first frame of hashtags from caption for display
export function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#([a-zA-Z0-9_]+)/g) ?? [];
  return [...new Set(matches.map((h) => h.slice(1).toLowerCase()))];
}

// Truncate long text with ellipsis
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "…";
}

// Get initials from name (for avatar fallback)
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── URL helpers ──────────────────────────────────────────────────────────────
export function profileUrl(username: string) {
  return `/${username}`;
}

export function postUrl(postId: string) {
  return `/p/${postId}`;
}

// ─── File helpers ─────────────────────────────────────────────────────────────
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

// Clamp a number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Generate a random placeholder color from username (consistent per user)
export function userColor(username: string): string {
  const colors = [
    "#F59E0B", // amber  (brand-adjacent)
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#10B981", // emerald
    "#3B82F6", // blue
    "#F97316", // orange
    "#14B8A6", // teal
    "#EF4444", // red
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length]!;
}