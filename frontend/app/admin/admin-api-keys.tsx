"use client";

import { useState, useEffect, useTransition } from "react";
import { Key, Plus, Copy, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_KEY_EXPIRY_PRESETS } from "@/lib/constants/api-key";
import {
  createApiKeyForApp,
  listApiKeysForAdmin,
  revokeApiKey,
  type ApiKeyEntry,
  type CreateApiKeyResult,
} from "@/lib/actions/api-key-actions";

function OneTimeKeyDisplay({
  result,
  onDismiss,
}: {
  result: CreateApiKeyResult & { success: true };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!result.key) return;
    void navigator.clipboard.writeText(result.key);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardHeader className="pb-2 px-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Key className="h-4 w-4" />
          API key created — copy it now
        </CardTitle>
        <CardDescription>
          This key is shown only once. Store it securely in your app (e.g. environment variable). You won’t be able to see it again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-6">
        <div className="flex gap-2">
          <Input
            readOnly
            value={result.key}
            className="font-mono text-sm"
          />
          <Button variant="outline" size="icon" onClick={copy} title="Copy">
            {copied ? (
              <span className="text-xs">Copied</span>
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          App: {result.name} {result.prefix && `· Prefix: ${result.prefix}`}
        </p>
        <Button variant="secondary" size="sm" onClick={onDismiss}>
          Done
        </Button>
      </CardContent>
    </Card>
  );
}

function ApiKeyRow({ entry, onRevoked }: { entry: ApiKeyEntry; onRevoked: () => void }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const handleRevoke = () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    startTransition(async () => {
      const r = await revokeApiKey(entry.id);
      if (r.success) onRevoked();
    });
  };

  const appUrl = entry.metadata && typeof entry.metadata === "object" && "appUrl" in entry.metadata
    ? String(entry.metadata.appUrl)
    : null;
  const description = entry.metadata && typeof entry.metadata === "object" && "description" in entry.metadata
    ? String(entry.metadata.description)
    : null;
  const isExpired = entry.expiresAt ? new Date(entry.expiresAt) < new Date() : false;

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-4 border-b border-border last:border-0 ${isExpired ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-card-foreground truncate">{entry.name || "Unnamed app"}</p>
          {isExpired && (
            <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">Expired</span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground flex-wrap">
          {entry.prefix && (
            <span className="font-mono">{entry.prefix}…</span>
          )}
          {entry.start && (
            <span className="font-mono text-xs">({entry.start}…)</span>
          )}
          {appUrl && (
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[200px]"
            >
              {appUrl.replace(/^https?:\/\//, "").slice(0, 30)}…
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Created {new Date(entry.createdAt).toLocaleDateString()}
          {entry.expiresAt
            ? isExpired
              ? ` · Expired ${new Date(entry.expiresAt).toLocaleDateString()}`
              : ` · Expires ${new Date(entry.expiresAt).toLocaleDateString()}`
            : " · No expiry"}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 ml-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleRevoke}
        disabled={pending}
        title={confirm ? "Click again to revoke this key" : "Revoke this API key"}
      >
        {pending ? (
          "…"
        ) : (
          <>
            <Trash2 className="h-4 w-4" />
            {confirm ? "Click again to revoke" : "Revoke"}
          </>
        )}
      </Button>
    </div>
  );
}

export default function AdminApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [oneTimeResult, setOneTimeResult] = useState<(CreateApiKeyResult & { success: true }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fetchKeys = () => {
    setLoading(true);
    listApiKeysForAdmin().then((r) => {
      setLoading(false);
      if (r.success) setApiKeys(r.apiKeys);
      else setError(r.error);
    });
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const [name, setName] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [description, setDescription] = useState("");
  const [expiresIn, setExpiresIn] = useState<keyof typeof API_KEY_EXPIRY_PRESETS>("none");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("App name is required");
      return;
    }
    startTransition(async () => {
      const result = await createApiKeyForApp({
        name: name.trim(),
        appUrl: appUrl.trim() || undefined,
        description: description.trim() || undefined,
        expiresIn: expiresIn === "none" ? null : expiresIn,
      });
      if (result.success) {
        setOneTimeResult(result);
        setName("");
        setAppUrl("");
        setDescription("");
        setExpiresIn("none");
        fetchKeys();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API keys for external apps
        </CardTitle>
        <CardDescription>
          Create API keys so other apps (e.g. Time Harbor) can call Pulse Vault APIs. The secret key is shown only once after creation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {oneTimeResult && (
          <OneTimeKeyDisplay
            result={oneTimeResult}
            onDismiss={() => setOneTimeResult(null)}
          />
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="api-key-name">App name</Label>
            <Input
              id="api-key-name"
              placeholder="e.g. Time Harbor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="api-key-url">App URL (optional)</Label>
            <Input
              id="api-key-url"
              type="url"
              placeholder="https://timeharbor.example.com"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="api-key-desc">Description / notes (optional)</Label>
            <Input
              id="api-key-desc"
              placeholder="e.g. Production Time Harbor instance"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="api-key-expiry">Expires (optional)</Label>
            <select
              id="api-key-expiry"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value as keyof typeof API_KEY_EXPIRY_PRESETS)}
              disabled={pending}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="none">No expiry</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="1y">1 year</option>
            </select>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? (
              "Creating…"
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Generate API key
              </>
            )}
          </Button>
        </form>

        <div>
          <h4 className="text-sm font-medium text-card-foreground mb-2">Existing keys</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Create one above.</p>
          ) : (
            <div className="rounded-md border border-border overflow-hidden">
              {apiKeys.map((entry) => (
                <ApiKeyRow key={entry.id} entry={entry} onRevoked={fetchKeys} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
