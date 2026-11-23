// Node entry for the published package. The page script is dist/attackfee.js (built separately);
// these URLs point at the files shipped next to dist/index.js.

function packagedFile(name: string): URL {
  return new URL(name, import.meta.url);
}

/** Page script. */
export const attackfeeJs = packagedFile("./attackfee.js");
/** Standard-mode worker. */
export const attackfeeWorker = packagedFile("./attackfee.worker.js");
/** Hardened-mode worker, loaded only when a check asks for it. */
export const attackfeeWorkerArgon2id = packagedFile("./attackfee.worker-argon2id.js");
/** Third-party notices for the page script and workers. */
export const licenses = packagedFile("./LICENSES.txt");
