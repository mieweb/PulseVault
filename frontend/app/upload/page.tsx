import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { unauthorized } from "next/navigation";
import UploadClient from "./upload-client";

export default async function UploadPage() {
  const session = await getSession();
  const user = session?.user;
  if(!user) unauthorized();
  
  return <UploadClient session={session} />;
}

