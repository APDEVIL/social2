import { redirect } from "next/navigation";
import { getSession } from "@/server/better-auth/server";

export default async function RootPage() {
  // Call your cached getSession function (no arguments needed!)
  const session = await getSession();

  if (session) {
    redirect("/feed");
  } else {
    redirect("/login");
  }
}