import { unauthorized, forbidden } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { getTopVideos } from "@/lib/actions/admin-actions";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session?.user) unauthorized();

  const userRole = session.user.role;
  if (!userRole || userRole.toLowerCase() !== "admin") forbidden();

  let topVideos: { videoId: string; watched50Count: number }[] = [];
  try {
    topVideos = await getTopVideos();
  } catch (err) {
    console.error("[analytics] failed to load top videos:", err);
  }

  return <AnalyticsClient topVideos={topVideos} />;
}
