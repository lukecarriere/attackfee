// A caller-supplied field name must not come back in a challenge shape error.
// tests/fixtures/history keeps a PHP interpolation and a Node concatenation that did.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { assertChallengeShape } from "../packages/protocol/src/index.ts";
import { AttackfeeError } from "../packages/protocol/src/errors.ts";

const ECHO = [/unknown field\s*\$/, /"unknown field "\s*\+/];

function echoesField(src: string) {
  return ECHO.some((re) => re.test(src));
}

test("assertChallengeShape does not echo the unknown field name", () => {
  assert.throws(
    () => assertChallengeShape({ nope_field: 1 }),
    (e: unknown) => {
      assert.ok(e instanceof AttackfeeError);
      assert.equal(e.code, "malformed");
      assert.equal(e.message, "unknown field");
      assert.equal(e.message.includes("nope_field"), false);
      return true;
    },
  );
});

test("current Node and PHP sources do not interpolate the field name", () => {
  assert.equal(echoesField(readFileSync("packages/protocol/src/challenge.ts", "utf8")), false);
  assert.equal(echoesField(readFileSync("packages/server-php/src/Attackfee.php", "utf8")), false);
  const php = execFileSync("php", ["-r", `
    require "packages/server-php/vendor/autoload.php";
    try {
      Attackfee\\Protocol::assertChallengeShape(["nope_field" => 1]);
      fwrite(STDERR, "no throw\\n");
      exit(1);
    } catch (Attackfee\\AttackfeeError $e) {
      if ($e->codeName !== "malformed" || $e->getMessage() !== "unknown field" || str_contains($e->getMessage(), "nope_field")) exit(1);
      echo "ok\\n";
    }
  `], { encoding: "utf8" });
  assert.equal(php.trim(), "ok");
});

test("a PHP sample echoed the field name", () => {
  const src = readFileSync(new URL("./fixtures/history/echo-field.php.txt", import.meta.url), "utf8");
  assert.equal(echoesField(src), true);
  assert.match(src, /unknown field \$k/);
});

test("a Node sample concatenated the field name", () => {
  const src = readFileSync(new URL("./fixtures/history/echo-field.ts.txt", import.meta.url), "utf8");
  assert.equal(echoesField(src), true);
  assert.match(src, /"unknown field " \+ k/);
});
