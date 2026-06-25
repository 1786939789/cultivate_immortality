import { spawn } from "node:child_process";

const apiPort = process.env.API_PORT || process.env.PORT || "8787";
const env = { ...process.env, PORT: apiPort, API_PORT: apiPort };

const commands = [
  ["api", "node", ["server/index.mjs"]],
  ["web", "vite", ["--host", "127.0.0.1"]]
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    env,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
});

function stop() {
  for (const child of children) child.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
