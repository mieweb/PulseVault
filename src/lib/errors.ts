export type PulseVaultErrorBody = {
  ok: false;
  error: string;
};

export function pulseVaultError(error: string): PulseVaultErrorBody {
  return { ok: false, error };
}
