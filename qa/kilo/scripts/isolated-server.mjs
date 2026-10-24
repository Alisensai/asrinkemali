import { spawn } from "node:child_process";
import net from "node:net";

function getFreePort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

const port = await getFreePort();
console.log(`Starting isolated server on port ${port}`);
console.log(`URL: http://127.0.0.1:${port}`);
console.log(`Commit: ${process.env.GIT_COMMIT || "unknown"}`);
console.log(`Branch: ${process.env.GIT_BRANCH || "unknown"}`);

const proc = spawn("npm", ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", port.toString()], {
  cwd: "web",
  shell: true,
  stdio: "inherit"
});

process.on("SIGINT", () => proc.kill());
process.on("SIGTERM", () => proc.kill());
