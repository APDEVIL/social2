import type { Metadata } from "next";
import { FeedClient } from "@/components/posts/fee-client";

export const metadata: Metadata = { title: "Home" };

export default function FeedPage() {
  return <FeedClient />;
}