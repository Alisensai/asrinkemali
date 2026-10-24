import { startIsolatedServer, stopIsolatedServer } from "../../../tools/qa-unified/lib/server.mjs";
import { gitValue } from "../../../tools/qa-unified/lib/runtime.mjs";

let server;
let shuttingDown = false;
let finish;
const finished = new Promise((resolve) => { finish = resolve; });

try {
  server = await startIsolatedServer({ mode: "dev" });
  console.log(`Owned isolated server: ${server.url}`);
  console.log(`PID: ${server.child.pid}`);
  console.log(`Branch: ${await gitValue(["branch", "--show-current"]) || "detached"}`);
  console.log(`Commit: ${await gitValue(["rev-parse", "HEAD"]) || "unknown"}`);
  server.child.once("close", (code) => {
    if (!shuttingDown) {
      console.error(`Isolated server exited unexpectedly with code ${code ?? 1}.`);
      process.exitCode = code ?? 1;
    }
    finish();
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, async () => {
      shuttingDown = true;
      process.exitCode = signal === "SIGINT" ? 130 : 143;
      await stopIsolatedServer(server.child);
      finish();
    });
  }
  await finished;
} catch (error) {
  console.error(`Could not start isolated QA server: ${error.message}`);
  process.exitCode = 1;
}
