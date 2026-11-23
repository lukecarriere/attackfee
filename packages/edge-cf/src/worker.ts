// Local edge worker (spec §11): issuer and gate in front of ORIGIN.
// Pass and token single-use runs in AttackfeeStoreDO, one named instance. Each call takes a new
// stub from the request that is in flight (AsyncLocalStorage), so the stub is not reused on a
// later request, and the issuer instance stays cached. KV, when bound, holds the optional route
// list only. A KV binding without the Durable Object throws before the request is handled.
// With neither binding, the store is in memory for this isolate.
import { AsyncLocalStorage } from "node:async_hooks";
import { MemoryStore } from "../../server-node/src/stores.ts";
import { createEdgeHandler, type EdgeEnv, type EdgeStore } from "./handler.ts";
import { STORE_REQUIRED } from "./kv-store.ts";
import { DurableObjectStore, type AttackfeeDoStub } from "./do-store.ts";

export type { EdgeEnv };
export { AttackfeeStoreDO } from "./do-store.ts";

interface DoNs {
  idFromName(name: string): unknown;
  get(id: unknown): AttackfeeDoStub;
}

export interface WorkerEnv extends EdgeEnv {
  ATTACKFEE_STORE?: DoNs;
}

const INSTANCE = "edge";

const requestEnv = new AsyncLocalStorage<WorkerEnv>();

function openDo(): DurableObjectStore {
  const ns = requestEnv.getStore()?.ATTACKFEE_STORE;
  if (!ns) throw new Error(STORE_REQUIRED);
  return new DurableObjectStore(ns.get(ns.idFromName(INSTANCE)));
}

function durableStore(): EdgeStore {
  return {
    firstUse: (key, ttl) => openDo().firstUse(key, ttl),
    consume: (key, initial, ttl) => openDo().consume(key, initial, ttl),
    peek: (key) => openDo().peek(key),
    setTag: (key, tag, ttl) => openDo().setTag(key, tag, ttl),
    getTag: (key) => openDo().getTag(key),
    consumeTagged: (useKey, initial, ttl, tagKey) => openDo().consumeTagged(useKey, initial, ttl, tagKey),
    windowHit: (key, window) => openDo().windowHit(key, window),
    note: (kind, test) => openDo().note(kind, test),
    noteCounters: (delta, test) => openDo().noteCounters(delta, test),
  };
}

const handler = createEdgeHandler<WorkerEnv>({
  store(env) {
    if (env.ATTACKFEE_STORE) return durableStore();
    if (env.ATTACKFEE_KV) throw new Error(STORE_REQUIRED);
    return new MemoryStore(() => Math.floor(Date.now() / 1000));
  },
});

export default {
  async fetch(req: Request, env: WorkerEnv): Promise<Response> {
    if (env.ATTACKFEE_KV && !env.ATTACKFEE_STORE) throw new Error(STORE_REQUIRED);
    return requestEnv.run(env, () => handler.fetch(req, env));
  },
};
