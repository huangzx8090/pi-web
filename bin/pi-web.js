#!/usr/bin/env node
"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getUnsupportedNodeVersionMessage, isNodeVersionSupported } = require("./node-version");

if (!isNodeVersionSupported(process.versions.node)) {
  console.error(getUnsupportedNodeVersionMessage(process.versions.node));
  process.exit(1);
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { spawn } = require("child_process");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require("os");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getHelpText, parseLaunchOptions } = require("./pi-web-options");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getNextNodeArgs } = require("./pi-web-node-args");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { wireChildProcessLifecycle } = require("./process-lifecycle");

let launchOptions;
try {
  launchOptions = parseLaunchOptions();
} catch (error) {
  fs.writeSync(
    process.stderr.fd,
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

if (launchOptions.help) {
  fs.writeSync(process.stdout.fd, getHelpText());
  process.exit(0);
}

const { port, hostname, openBrowser } = launchOptions;

const pkgDir = path.join(__dirname, "..");
const nextDir = path.join(pkgDir, ".next");

// Resolve next's CLI entry directly to avoid relying on .bin symlinks (which
// may not exist when installed via npx).
let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next", { paths: [pkgDir] });
} catch {
  // Fallback: locate next package root and derive the bin path manually.
  try {
    const nextPkg = require.resolve("next/package.json", { paths: [pkgDir] });
    nextBin = path.join(path.dirname(nextPkg), "dist", "bin", "next");
  } catch {
    nextBin = path.join(pkgDir, "node_modules", "next", "dist", "bin", "next");
  }
}

const loopbackHostnames = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const passwordEnabled = Boolean(process.env.PI_WEB_PASSWORD);

if (!fs.existsSync(nextDir)) {
  console.error("Build artifacts not found. Please report this issue.");
  process.exit(1);
}

if (!loopbackHostnames.has(hostname)) {
  if (passwordEnabled) {
    console.warn(
      `Warning: pi-web is listening on ${hostname} with password authentication over HTTP. Use HTTPS or a trusted VPN to protect the password in transit.`,
    );
  } else {
    console.warn(
      `Warning: pi-web is listening on ${hostname} without authentication. Only use this on a trusted network.`,
    );
  }
}

const nextArgs = ["start", "-p", port];
nextArgs.push("-H", hostname);

const url = `http://${hostname}:${port}`;
let browserOpened = false;

// --- Pid file ---------------------------------------------------------------
// The stop helpers (launch.sh / ~/.zshrc / rebuild.sh, via pi-web-lifecycle.zsh)
// need to signal *this* wrapper, not just the listening `next start` child —
// otherwise the supervisor below treats a requested stop as a crash and brings
// the child right back. A pid file is more reliable than looking the parent up
// with `ps`, which is not available in every environment.
const pidFile = path.join(
  process.env.HOME || os.homedir(),
  `.pi-web-${port}.pid`,
);
let pidFileOwned = false;
try {
  fs.writeFileSync(pidFile, `${process.pid}\n`);
  pidFileOwned = true;
} catch {
  // Best effort: without it a stop falls back to ending the listening child.
}

process.on("exit", () => {
  if (!pidFileOwned) return;
  try {
    // Only remove a file that still belongs to us, so a newer instance's pid
    // file is never deleted by an older process shutting down.
    if (fs.readFileSync(pidFile, "utf8").trim() === String(process.pid)) {
      fs.rmSync(pidFile, { force: true });
    }
  } catch {
    // Nothing left to clean up.
  }
});

// --- Supervisor -------------------------------------------------------------
// `bin/process-lifecycle.js` makes the wrapper die together with its child, so
// a crashed `next start` used to take the whole server down until someone
// relaunched it by hand. An *unexpected* child exit is retried here instead.
// A shutdown we asked for (SIGTERM/SIGINT, e.g. `pi-web-stop`) still exits for
// good, which is why the stop helpers also signal this wrapper, not just the
// listening child.
const RESTART_DELAY_MS = 500;
const RESTART_WINDOW_MS = 60_000;
const MAX_RESTARTS_PER_WINDOW = 5;
const restartTimestamps = [];

function scheduleRestart() {
  const now = Date.now();
  while (restartTimestamps.length > 0 && now - restartTimestamps[0] > RESTART_WINDOW_MS) {
    restartTimestamps.shift();
  }

  if (restartTimestamps.length >= MAX_RESTARTS_PER_WINDOW) {
    console.error(
      `[pi-web] Next.js crashed ${restartTimestamps.length} times in under a minute; giving up so the port stops flapping. Read the log above, then run \`pi-web-stop && pi\`.`,
    );
    process.exit(1);
  }

  restartTimestamps.push(now);
  setTimeout(startChild, RESTART_DELAY_MS);
  return true;
}

function startChild() {
  // Always run next's JS entry with node directly — avoids .bin symlink issues
  // and path-with-spaces problems on Windows when shell: true is used.
  const child = spawn(process.execPath, getNextNodeArgs(nextBin, nextArgs), {
    cwd: pkgDir,
    stdio: ["inherit", "pipe", "inherit"],
    env: { ...process.env, PI_WEB_HOSTNAME: hostname, PI_WEB_CWD: process.env.PI_WEB_CWD || process.cwd() },
  });
  wireChildProcessLifecycle(child, process, undefined, console.error, {
    onUnexpectedExit: scheduleRestart,
  });
  watchChildForReady(child);
}

function watchChildForReady(child) {
  child.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    if (openBrowser && !browserOpened && text.includes("Ready")) {
      browserOpened = true;
      const isWindows = process.platform === "win32";
      const isMac = process.platform === "darwin";
      // Avoid `shell: true` to suppress Node.js DEP0190 deprecation
      // ("Passing args to a child process with shell option true can lead to
      // security vulnerabilities, as the arguments are not escaped").
      // Pass a structured argv so Node.js handles escaping instead of
      // concatenating the args into a shell command string.
      let opener;
      if (isWindows) {
        // `start` is a cmd.exe built-in, so invoke cmd directly. The empty
        // title argument is required by `start` before the target URL.
        opener = spawn(process.env.ComSpec || "cmd.exe", ["/c", "start", "", url], {
          stdio: "ignore",
          detached: true,
        });
      } else if (isMac) {
        const launchCwd = process.env.PI_WEB_CWD || process.cwd();
        const appUrl = `${url}/?cwd=${encodeURIComponent(launchCwd)}`;
        opener = spawn("open", ["-na", "Google Chrome", "--args", `--app=${appUrl}`], {
          stdio: "ignore",
          detached: true,
        });
      } else {
        opener = spawn("xdg-open", [url], {
          stdio: "ignore",
          detached: true,
        });
      }

      opener.on("error", (error) => {
        console.warn(`Could not open browser automatically: ${error.message}`);
      });

      opener.unref();
    }
  });
}

startChild();

