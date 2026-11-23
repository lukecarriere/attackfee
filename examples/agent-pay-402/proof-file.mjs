// Shared helpers for fund.mjs and pay.mjs: the wallet file and the mint transport.
//
// The wallet file is JSON: {"mint": "<mint url>", "unit": "sat", "proofs": [{amount, id, secret, C}],
// "unconfirmed": [...]}. It holds bearer ecash, so it is written with mode 0600 (created that way,
// then checked) and a file that group or others can read is refused. Its contents are never printed.
// A file that holds one bare cashuA or cashuB token is also read, and is rewritten as JSON on change.
import { constants } from "node:fs";
import { chmod, lstat, open, readFile, rename, unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { CASHU_UNIT, decodeToken } from "../../packages/settlement-ln/src/cashu.ts";
import { assertProductionMint, isLoopbackHost, mintKey } from "../../packages/settlement-ln/src/cashu-net.ts";
import { toHex } from "../../packages/protocol/src/bytes.ts";

export const DEFAULT_MINT = "https://mint.minibits.cash/Bitcoin";

/** An error whose message is safe to print: it never carries a proof, token, secret or response body. */
export class Fail extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

/** Print a failure without echoing anything that was not written by these scripts. */
export function report(e) {
  if (e instanceof Fail) {
    process.stderr.write("error: " + e.message + "\n");
    return e.code;
  }
  const tag = e && typeof e === "object" && "code" in e && typeof e.code === "string" ? e.code : e?.name ?? "unknown";
  process.stderr.write("error: unexpected failure (" + tag + ")\n");
  return 1;
}

/** https and a public host name, or http to a loopback host (a local test mint). Returns the normalised URL. */
export function checkMintUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Fail("mint must be an https URL"); }
  if (u.protocol === "http:" && isLoopbackHost(u.hostname.replace(/^\[|\]$/g, ""))) return mintKey(raw);
  try { return assertProductionMint(raw); } catch (e) { throw new Fail("mint " + e.message + " (an https URL is required)"); }
}

/**
 * Test only. ATTACKFEE_MINT_PROXY sends every call for the mint to a loopback test mint, the way
 * the Worker's CASHU_FETCH_PROXY does, so a suite never reaches a real mint. Anything that is not
 * http(s) on a loopback host is refused.
 */
export function mintProxy() {
  const raw = process.env.ATTACKFEE_MINT_PROXY ?? "";
  if (raw === "") return null;
  let u;
  try { u = new URL(raw); } catch { throw new Fail("ATTACKFEE_MINT_PROXY must be a loopback URL"); }
  if (!/^https?:$/.test(u.protocol) || !isLoopbackHost(u.hostname)) throw new Fail("ATTACKFEE_MINT_PROXY must be a loopback URL");
  return u.origin;
}

/** fetch that rewrites `<mint>/v1/...` to the proxy when one is set. */
export function proxiedFetch(proxy) {
  if (!proxy) return fetch;
  return (input, init) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const u = new URL(href);
    const i = u.pathname.indexOf("/v1/");
    return fetch(proxy + (i >= 0 ? u.pathname.slice(i) : u.pathname) + u.search, init);
  };
}

/** One mint call: no redirects, a timeout, a bounded body. Returns status and parsed JSON (or null). */
export async function mintCall(mint, path, init = {}, o = {}) {
  const f = proxiedFetch(mintProxy());
  let r;
  try {
    r = await f(mint + path, { ...init, redirect: "manual", signal: AbortSignal.timeout(o.timeoutMs ?? 10_000) });
  } catch {
    return { status: 0, body: null };
  }
  const buf = await r.arrayBuffer().catch(() => new ArrayBuffer(0));
  if (buf.byteLength > 1_000_000 || (r.status >= 300 && r.status < 400)) return { status: r.status, body: null };
  let body = null;
  try { body = JSON.parse(new TextDecoder().decode(buf)); } catch { body = null; }
  return { status: r.status, body };
}

const PROOF_HEX = /^[0-9a-f]+$/;

function cleanProofs(list) {
  if (!Array.isArray(list)) throw new Fail("wallet file is not valid");
  return list.map((p) => {
    if (!p || !Number.isSafeInteger(p.amount) || p.amount <= 0 || typeof p.secret !== "string" || typeof p.id !== "string" || typeof p.C !== "string" || !PROOF_HEX.test(p.id.toLowerCase()) || !PROOF_HEX.test(p.C.toLowerCase())) throw new Fail("wallet file is not valid");
    return { amount: p.amount, id: p.id.toLowerCase(), secret: p.secret, C: p.C.toLowerCase() };
  });
}

/** Refuse anything but a regular file that only its owner can read or write. */
async function checkMode(path) {
  let st;
  try { st = await lstat(path); } catch (e) {
    if (e?.code === "ENOENT") return false;
    throw new Fail("cannot read the wallet file");
  }
  if (!st.isFile()) throw new Fail("the wallet file must be a regular file");
  if ((st.mode & 0o077) !== 0) throw new Fail("the wallet file must be mode 0600 (chmod 600 <file>)");
  return true;
}

/** Read a wallet file. Null when it does not exist. */
export async function readWallet(path) {
  if (!(await checkMode(path))) return null;
  const text = (await readFile(path, "utf8")).trim();
  if (/^cashu[AB]/.test(text)) {
    let t;
    try { t = decodeToken(text); } catch { throw new Fail("wallet file holds a token that does not decode"); }
    if (t.unit !== CASHU_UNIT) throw new Fail("wallet file token is not in sat");
    return { mint: mintKey(t.mint), unit: CASHU_UNIT, proofs: t.proofs.map((p) => ({ amount: p.amount, id: toHex(p.id), secret: p.secret, C: toHex(p.C) })), unconfirmed: [] };
  }
  let j;
  try { j = JSON.parse(text); } catch { throw new Fail("wallet file is not valid"); }
  if (!j || typeof j.mint !== "string" || (j.unit ?? CASHU_UNIT) !== CASHU_UNIT) throw new Fail("wallet file is not valid");
  let mint;
  try { mint = mintKey(j.mint); } catch { throw new Fail("wallet file is not valid"); }
  const unconfirmed = Array.isArray(j.unconfirmed) ? j.unconfirmed : [];
  return { mint, unit: CASHU_UNIT, proofs: cleanProofs(j.proofs ?? []), unconfirmed };
}

/** Write JSON to `path` through a temp file created with mode 0600, then rename. Checks the result. */
export async function writeSecretFile(path, value) {
  const tmp = path + ".tmp-" + randomBytes(6).toString("hex");
  const fh = await open(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try {
    await fh.writeFile(JSON.stringify(value, null, 1) + "\n");
    await fh.sync();
  } finally {
    await fh.close();
  }
  try {
    await chmod(tmp, 0o600);
    await rename(tmp, path);
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw new Fail("could not write " + path);
  }
  const st = await lstat(path);
  if ((st.mode & 0o777) !== 0o600) throw new Fail(path + " is not mode 0600");
}

export async function writeWallet(path, w) {
  const out = { mint: w.mint, unit: CASHU_UNIT, proofs: w.proofs };
  if (w.unconfirmed && w.unconfirmed.length > 0) out.unconfirmed = w.unconfirmed;
  await writeSecretFile(path, out);
}

/** Read a 0600 JSON side file (the pending mint). Null when absent. */
export async function readSecretJson(path) {
  if (!(await checkMode(path))) return null;
  try { return JSON.parse(await readFile(path, "utf8")); } catch { throw new Fail(path + " is not valid"); }
}

export const total = (proofs) => proofs.reduce((n, p) => n + p.amount, 0);
