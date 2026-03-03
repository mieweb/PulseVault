const STORAGE_KEY = "pv_client_id";

export function getClientId(userId?: string | null): string {
  if (userId) {
    return userId;
  }

  // Server-side: no DOM/localStorage available
  if (typeof window === "undefined") {
    return "";
  }

  // Client-side: return or generate a persistent anonymous ID
  let clientId = localStorage.getItem(STORAGE_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, clientId);
  }

  return clientId;
}
