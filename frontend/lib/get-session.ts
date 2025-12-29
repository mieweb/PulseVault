import { headers } from "next/headers";
import { auth } from "./auth";
import { cache } from "react";

export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});