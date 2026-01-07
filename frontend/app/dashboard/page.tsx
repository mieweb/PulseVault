import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { signOut } from "@/lib/actions/auth-actions";
import DashboardClient from "./dashboard-client";
import { unauthorized } from "next/navigation";
import { getAllVideos } from "@/lib/actions/video-actions";

export default async function DashboardPage() {
  const session = await getSession();
  const user = session?.user;
  if(!user)unauthorized();
  
  // Get initial videos for the feed
  const { videos, pagination } = await getAllVideos(1, 20);
  
  return <DashboardClient session={session} initialVideos={videos} initialPagination={pagination} />;
}
