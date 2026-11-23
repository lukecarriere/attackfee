// Workers KV binding shape. The handler reads the optional `attackfee_routes` list from it.
// Pass and token single-use does not. KV has no compare-and-swap, so those decisions run in
// AttackfeeStoreDO (packages/edge-cf/src/worker.ts). A binding without that object throws
// before the request is handled.

export const STORE_REQUIRED =
  "ATTACKFEE_STORE is required when ATTACKFEE_KV is bound. Pass and token single-use runs in the Durable Object.";

export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}
