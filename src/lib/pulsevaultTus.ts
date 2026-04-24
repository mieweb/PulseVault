import { Server } from "@tus/server";
import type { FastifyRequest } from "fastify";
import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import { isUuid } from "./uuid.js";
import type { PulseVaultValidatePayload } from "./magic.js";
import type { PulseVaultStorage } from "../storage/types.js";

/**
 * Context the plugin stashes on each incoming Fastify request for the lifetime
 * of a TUS call. Shared with the tus hooks via `AsyncLocalStorage` because
 * `@tus/server` v2 hooks receive a web `Request`, not the FastifyRequest.
 */
export type PulseVaultTusContext = {
  request: FastifyRequest;
  videoid?: string;
};

export const pulseVaultTusContext = new AsyncLocalStorage<PulseVaultTusContext>();

export type PulseVaultOnUploadComplete = (
  request: FastifyRequest,
  ctx: { videoid: string; size: number; uploadId: string },
) => void | Promise<void>;

export type PulsevaultTusOptions = {
  storage: PulseVaultStorage;
  /** Absolute URL path where TUS is mounted, e.g. `/pulsevault/upload`. */
  tusPath: string;
  /** Max total upload size in bytes. Use `Infinity` for no cap. */
  maxSize: number;
  /**
   * File extensions allowed in the upload `filename` metadata. Must be
   * pre-normalized to lowercase and include the leading dot.
   */
  allowedExtensions: readonly string[];
  /**
   * Optional payload-validation hook. Runs after TUS writes the final byte
   * but before `markReady` and `onUploadComplete`. Throwing from this hook
   * causes the plugin to `storage.remove?.(videoid)` and return a 4xx
   * (default 422) to the client. Use for magic-byte sniffing, virus
   * scanning, size re-checks — anything that needs the final bytes.
   */
  validatePayload?: PulseVaultValidatePayload;
  /**
   * Fired once the final byte of an upload has been written *and* any
   * `validatePayload` has passed. Use this to flip consumer state (DB row,
   * queue job, audit log). Throwing here returns a 500 — bytes are on disk
   * and marked ready, but consumer-side work failed.
   */
  onUploadComplete?: PulseVaultOnUploadComplete;
};

/**
 * Shape `@tus/server` recognizes for sending an error response. We tag both
 * `statusCode` and `status_code` so throws originating from either Fastify
 * conventions (camelCase) or the tus convention (snake_case) surface with the
 * right HTTP status.
 */
export function tusError(status: number, body: string): Error {
  return Object.assign(new Error(body), {
    statusCode: status,
    status_code: status,
    body,
  });
}

/** Parse the first path segment of a tus upload id as the videoid. */
function videoidFromUploadId(id: string): string | undefined {
  const first = id.split("/", 1)[0];
  return isUuid(first) ? first : undefined;
}

/**
 * Extract a numeric HTTP status from a thrown error, honoring both
 * `statusCode` (Fastify) and `status_code` (tus).
 */
function statusCodeOf(err: unknown, fallback: number): number {
  const e = err as { statusCode?: unknown; status_code?: unknown };
  if (typeof e?.statusCode === "number") return e.statusCode;
  if (typeof e?.status_code === "number") return e.status_code;
  return fallback;
}

export function createPulsevaultTusServer(options: PulsevaultTusOptions) {
  const {
    storage,
    tusPath,
    maxSize,
    allowedExtensions,
    validatePayload,
    onUploadComplete,
  } = options;

  return new Server({
    path: tusPath,
    datastore: storage.datastore,
    maxSize,
    namingFunction: async (_req, metadata) => {
      const videoid = metadata?.videoid ?? "";
      const filename = (metadata?.filename ?? "").trim();

      if (!isUuid(videoid)) {
        throw tusError(
          400,
          "Upload-Metadata must include a valid `videoid` (UUID).\n",
        );
      }

      const ext = path.extname(filename).toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        throw tusError(
          400,
          `Upload-Metadata \`filename\` must end with one of: ${allowedExtensions.join(
            ", ",
          )}\n`,
        );
      }

      return storage.reserveUpload({ videoid, filename, ext });
    },
    generateUrl(_req, { proto, host, path: tusBasePath, id }) {
      const encoded = Buffer.from(id, "utf8").toString("base64url");
      return `${proto}://${host}${tusBasePath}/${encoded}`;
    },
    getFileIdFromRequest(_req, lastPath) {
      if (!lastPath) {
        return;
      }
      return Buffer.from(lastPath, "base64url").toString("utf8");
    },
    onUploadFinish: async (_req, upload) => {
      // Completion sequence: validate → markReady → consumer hook. Each step
      // gates the next; failure anywhere short-circuits with a tus error
      // (and cleans up disk state for validation failures specifically).
      const store = pulseVaultTusContext.getStore();
      if (!store) {
        // Should not happen — the Fastify layer always establishes a store
        // before calling into tus. Bail quietly rather than crash.
        return {};
      }
      const videoid = videoidFromUploadId(upload.id);
      if (!videoid) {
        return {};
      }
      const size = upload.size ?? 0;
      const uploadId = upload.id;

      // 1. Validate payload (magic bytes, virus scan, etc.). If this throws
      //    we wipe the bytes from storage — the client gets a 4xx, the
      //    sidecar is gone, and they can safely retry with a corrected file.
      if (validatePayload) {
        try {
          await validatePayload(store.request, {
            videoid,
            size,
            uploadId,
            localPath: await resolveLocalPath(storage, videoid),
          });
        } catch (err) {
          const status = statusCodeOf(err, 422);
          const message =
            err instanceof Error ? err.message : "Payload validation failed";
          try {
            await storage.remove?.(videoid);
          } catch (rmErr) {
            store.request.log.error(
              { err: rmErr, videoid },
              "pulsevault failed to remove rejected upload",
            );
          }
          throw tusError(status, `${message}\n`);
        }
      }

      // 2. Flip the sidecar to "ready" so `resolve` will serve the bytes.
      //    Done *before* the consumer hook so a downstream service that
      //    reacts to `onUploadComplete` can immediately GET the video.
      try {
        await storage.markReady?.(videoid);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "markReady failed";
        throw tusError(500, `${message}\n`);
      }

      // 3. Consumer hook — business logic (DB writes, queue jobs).
      if (onUploadComplete) {
        try {
          await onUploadComplete(store.request, { videoid, size, uploadId });
        } catch (err) {
          // Propagate as a tus error so the client sees a non-2xx and can
          // distinguish "bytes stored but completion hook failed" from
          // success. The video is marked ready at this point — consumers
          // who want "all-or-nothing" should `storage.remove` before
          // throwing.
          const message =
            err instanceof Error ? err.message : "onUploadComplete failed";
          throw tusError(500, `${message}\n`);
        }
      }

      return {};
    },
  });
}

/**
 * If the adapter exposes `getLocalPath` (the built-in local adapter does),
 * resolve the videoid to an absolute disk path for `validatePayload`. For
 * other adapters, returns `null` and the validator is expected to fetch
 * bytes through whatever API it knows about.
 */
async function resolveLocalPath(
  storage: PulseVaultStorage,
  videoid: string,
): Promise<string | null> {
  const candidate = (storage as { getLocalPath?: unknown }).getLocalPath;
  if (typeof candidate !== "function") return null;
  const result = await (candidate as (id: string) => Promise<string | null>)(
    videoid,
  );
  return typeof result === "string" ? result : null;
}
