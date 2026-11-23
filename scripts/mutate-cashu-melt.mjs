// Each mutant in the owner withdraw (melt) path must make a test in tests/edge-owner-withdraw.test.ts
// fail. The sources are restored afterwards.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const STORE = "packages/edge-cf/src/do-store.ts";
const MELT = "packages/settlement-ln/src/cashu-melt.ts";

const mutants = [
  {
    name: "pending row dropped before the melt call",
    file: STORE,
    from: `      this.sql.exec(
        "INSERT INTO cashu_withdraw (quote, mint, amount, fee_reserve, state, inputs, outputs, at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)",`,
    to: `      if (false) this.sql.exec(
        "INSERT INTO cashu_withdraw (quote, mint, amount, fee_reserve, state, inputs, outputs, at) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)",`,
  },
  {
    name: "over-balance check skipped",
    file: MELT,
    from: `  if (amount > stored) return { state: "refused", error: "too_much" };`,
    to: `  if (false) return { state: "refused", error: "too_much" };`,
  },
  {
    name: "amount + fee reserve over the balance not refused",
    file: MELT,
    from: `  if (amount + feeReserve > stored) return { state: "refused", error: "too_much", fee_reserve_sat: feeReserve };`,
    to: `  if (false) return { state: "refused", error: "too_much", fee_reserve_sat: feeReserve };`,
  },
  {
    name: "withdrawn counted twice on retry",
    file: STORE,
    from: `      if (!row || !(row.state === "pending" || (row.state === "released" && row.inputs.length > 0))) return null;`,
    to: `      if (!row) return null;`,
  },
  {
    name: "a second withdrawal sent while one is pending",
    file: STORE,
    from: `if (this.sql.exec("SELECT quote FROM cashu_withdraw WHERE state = 'pending' LIMIT 1").toArray().length) return { ok: false, error: "busy" };`,
    to: `if (false) return { ok: false, error: "busy" };`,
  },
  {
    name: "unpaid melt keeps the proofs out of the store",
    file: MELT,
    from: `  return (await d.store.release(quote, minAgeS)) ? { state: "released", quote, amount_sat: row.amount } : finalOf(await d.store.get(quote), quote);`,
    to: `  return { state: "released", quote, amount_sat: row.amount };`,
  },
  {
    name: "release when only some inputs are unspent",
    file: MELT,
    from: `if (!states.every((s) => s === "UNSPENT")) {`,
    to: `if (!states.some((s) => s === "UNSPENT")) {`,
  },
  {
    name: "release ignores the row state",
    file: STORE,
    from: `      if (!row || row.state !== "pending") return false;
      if (minAgeS > 0`,
    to: `      if (!row) return false;
      if (minAgeS > 0`,
  },
  {
    name: "reserve picks one sat short of the need",
    file: STORE,
    from: `if (sum >= need()) break;`,
    to: `if (sum + 1 >= need()) break;`,
  },
  {
    name: "5xx from the melt POST treated as unpaid",
    file: MELT,
    from: `if (state === "PENDING" || r.status === 429 || r.status >= 500) return`,
    to: `if (state === "PENDING" || r.status === 429) return`,
  },
  {
    name: "amountless invoice accepted",
    file: MELT,
    from: `if (amountMsat === null) return { state: "refused", error: "bad_invoice" };`,
    to: `if (amountMsat === null) amountMsat = 1000;`,
  },
  {
    name: "a check releases while the melt may still be in flight (no age rule)",
    file: MELT,
    from: `const minAgeS = o.answered ? 0 : releaseAgeS(d);`,
    to: `const minAgeS = 0;`,
  },
  {
    name: "store release ignores the minimum age",
    file: STORE,
    from: `if (minAgeS > 0 && this.now() - (row.at ?? 0) <= minAgeS) return false;`,
    to: `if (false) return false;`,
  },
  {
    name: "release wipes the blank change outputs",
    file: STORE,
    from: `this.sql.exec("UPDATE cashu_withdraw SET state = 'released' WHERE quote = ?", quote);`,
    to: `this.sql.exec("UPDATE cashu_withdraw SET state = 'released', inputs = '[]', outputs = '[]' WHERE quote = ?", quote);`,
  },
  {
    name: "finish refuses a released row the mint paid",
    file: STORE,
    from: `if (!row || !(row.state === "pending" || (row.state === "released" && row.inputs.length > 0))) return null;`,
    to: `if (!row || row.state !== "pending") return null;`,
  },
  {
    name: "finish of a released row leaves its spent inputs stored",
    file: STORE,
    from: `        for (const p of row.inputs) this.sql.exec("DELETE FROM cashu_proof WHERE secret = ?", p.secret);`,
    to: ``,
  },
  {
    name: "finish of a released row keeps a pending row that holds its spent inputs",
    file: STORE,
    from: `          this.sql.exec("UPDATE cashu_withdraw SET state = 'released' WHERE quote = ?", other.quote);`,
    to: ``,
  },
  {
    name: "release age is the melt timeout only (no 30 s grace)",
    file: MELT,
    from: `return Math.ceil(((d.meltTimeoutMs ?? MELT_TIMEOUT_MS) + RELEASE_GRACE_MS) / 1000);`,
    to: `return Math.ceil((d.meltTimeoutMs ?? MELT_TIMEOUT_MS) / 1000);`,
  },
  {
    name: "a released-row re-check settles on any reply, not only PAID",
    file: MELT,
    from: `if (body && meltState(body) === "PAID") return settlePaid(d, row, body);
  return finalOf(row, row.quote);`,
    to: `if (body) return settlePaid(d, row, body);
  return finalOf(row, row.quote);`,
  },
  {
    name: "unpaid quote with spent inputs never re-checks released rows",
    file: MELT,
    from: `if (states.includes("SPENT")) {`,
    to: `if (false) {`,
  },
  {
    name: "released-row re-check window is empty",
    file: STORE,
    from: `ORDER BY at DESC LIMIT 5`,
    to: `ORDER BY at DESC LIMIT 0`,
  },
];

function run() {
  // Node 23+ uses the spec reporter on a pipe, which has no "# fail N" line. Pin TAP.
  return spawnSync(process.execPath, ["--test", "--test-reporter=tap", "--test-concurrency=1", "tests/edge-owner-withdraw.test.ts"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

const originals = new Map([STORE, MELT].map((f) => [f, readFileSync(f, "utf8")]));
let survived = 0;
try {
  const base = run();
  if (base.status !== 0) throw new Error("the unmutated tests fail:\n" + ((base.stdout || "") + (base.stderr || "")).slice(-2000));
  for (const mutant of mutants) {
    const original = originals.get(mutant.file);
    if (!original.includes(mutant.from)) throw new Error(mutant.name + ": anchor missing");
    writeFileSync(mutant.file, original.replace(mutant.from, mutant.to));
    const result = run();
    writeFileSync(mutant.file, original);
    if (result.error) throw new Error(mutant.name + ": " + result.error.message);
    const text = (result.stdout || "") + (result.stderr || "");
    const failed = result.status !== 0 && /# fail [1-9]/.test(text);
    if (failed) console.log("killed: " + mutant.name);
    else {
      survived++;
      console.error("survived: " + mutant.name);
      console.error(text.slice(-2000));
    }
  }
} finally {
  for (const [f, src] of originals) writeFileSync(f, src);
}
if (survived) {
  console.error(survived + " melt mutant(s) survived");
  process.exit(1);
}
console.log("all " + mutants.length + " melt mutants killed");
