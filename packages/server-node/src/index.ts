import { createAttackfee, type Attackfee as AttackfeeInstance, type AttackfeeOptions } from "./attackfee.ts";
import { type AttackfeeConfig, loadConfig, normalizeConfig, classifyPath, DEFAULT_WORK, PAGE_VIEW_WARNING, PAGE_VIEW_CONFIRM } from "./config.ts";
import { attackfeeRouter, protect, guardFetch, extractPass, readBody, parseCookies, PASS_COOKIE, VERSION } from "./http.ts";

export { createAttackfee, loadConfig, normalizeConfig, classifyPath, DEFAULT_WORK, PAGE_VIEW_WARNING, PAGE_VIEW_CONFIRM, attackfeeRouter, protect, guardFetch, extractPass, readBody, parseCookies, PASS_COOKIE, VERSION };
export type { AttackfeeInstance, AttackfeeOptions, AttackfeeConfig };
export { solveWork } from "../../work-adapter/src/index.ts";
export { Metrics } from "./metrics.ts";
export { MemoryStore, WindowCounter, type AttackfeeStore } from "./stores.ts";

/**
 * Spec §12 surface:
 *   const attackfee = Attackfee.create(config)
 *   attackfee.issueChallenge({ site, action, path }) -> challenge
 *   attackfee.verifySolution(challenge, solution)    -> { pass, ... }
 *   attackfee.verifyPass(pass, { action, path })      -> claims (throws if invalid)
 *   Attackfee.middleware(attackfee, { action })            -> (req, res, next)
 */
export const Attackfee = {
  create: (config: AttackfeeConfig, opts?: AttackfeeOptions) => createAttackfee(config, opts),
  router: attackfeeRouter,
  middleware: protect,
  fetch: guardFetch,
};
