import assert from "node:assert/strict";
import test from "node:test";
import { checkForUpdate, isNewer, updateFrom } from "./update.ts";

const apk = "https://github.com/georgeMaharjan/Thaili/releases/download/v1.2/thaili.apk";
const release = (tag: string, url = apk) => ({ tag_name: tag, assets: [{ name: "thaili.apk.sha256", browser_download_url: url + ".sha256" }, { name: "thaili.apk", browser_download_url: url }] });

test("versions compare numerically, not as text", () => {
  assert.equal(isNewer("v1.10", "1.9"), true);
  assert.equal(isNewer("v1.2", "1.1"), true);
  assert.equal(isNewer("v1.1", "1.1"), false);
  assert.equal(isNewer("v1.1.0", "1.1"), false);
  assert.equal(isNewer("v1.0", "1.1"), false);
  assert.equal(isNewer("v2", "1.9.9"), true);
});

test("a newer release offers its APK; same or older offers nothing", () => {
  assert.deepEqual(updateFrom(release("v1.2"), "1.1"), { version: "1.2", url: apk });
  assert.equal(updateFrom(release("v1.1"), "1.1"), null);
});

test("malformed releases or foreign download links are never offered", () => {
  assert.equal(updateFrom(null, "1.1"), null);
  assert.equal(updateFrom({ tag_name: "v9" }, "1.1"), null);
  assert.equal(updateFrom({ tag_name: "v9", assets: [{ name: "other.apk", browser_download_url: apk }] }, "1.1"), null);
  assert.equal(updateFrom(release("v9", "https://evil.example/thaili.apk"), "1.1"), null);
});

test("checkForUpdate reads GitHub's latest release and fails loudly on HTTP errors", async () => {
  const ok = (async () => new Response(JSON.stringify(release("v1.2")))) as typeof fetch;
  assert.deepEqual(await checkForUpdate("1.1", ok), { version: "1.2", url: apk });
  const down = (async () => new Response("", { status: 503 })) as typeof fetch;
  await assert.rejects(checkForUpdate("1.1", down), /503/);
});
