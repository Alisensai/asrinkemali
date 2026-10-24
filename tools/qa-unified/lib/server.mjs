import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";
import { repoRoot, terminateProcessTree } from "./runtime.mjs";

const webRoot = path.join(repoRoot, "web");
const nextCli = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");

export async function getFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not reserve a local TCP port.");
  }
  const { port } = address;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

export async function isPortFree(port) {
  const server = net.createServer();
  return new Promise((resolve) => {
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => {
      server.close((error) => resolve(!error));
    });
  });
}

async function waitForReady(child, url, timeoutMs) {
  let output = "";
  let childError = null;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output = `${output}${chunk}`.slice(-20_000); });
  child.stderr.on("data", (chunk) => { output = `${output}${chunk}`.slice(-20_000); });
  child.on("error", (error) => { childError = error; });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Isolated server exited before readiness (${child.exitCode}): ${output.trim()}`);
    }
    if (childError) throw childError;
    if (/ready|started server/i.test(output)) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
        if (response.status > 0) return output.trim();
      } catch {
        // Keep waiting until the owned process is ready or the deadline expires.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Isolated server readiness timed out: ${output.trim()}`);
}

export async function startIsolatedServer({ mode, timeoutMs = 60_000 } = {}) {
  if (!["dev", "production"].includes(mode)) throw new Error(`Unsupported server mode: ${mode}`);
  if (!fs.existsSync(nextCli)) throw new Error("web dependencies are missing; run npm ci in web/ before starting QA.");
  if (mode === "production" && !fs.existsSync(path.join(webRoot, ".next", "BUILD_ID"))) {
    throw new Error("Production build is missing (web/.next/BUILD_ID); build before requesting production QA.");
  }

  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;
  const args = [nextCli, mode === "dev" ? "dev" : "start", "--hostname", "127.0.0.1", "--port", String(port)];
  const child = spawn(process.execPath, args, {
    cwd: webRoot,
    env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(port) },
    shell: false,
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const startupLog = await waitForReady(child, url, timeoutMs);
    return { child, port, url, mode, startupLog };
  } catch (error) {
    await stopIsolatedServer(child);
    throw error;
  }
}

export async function stopIsolatedServer(child) {
  if (!child || child.exitCode !== null) return;
  await terminateProcessTree(child);
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 5_000);
    child.once("close", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  if (child.exitCode === null) await terminateProcessTree(child, { force: true });
}
