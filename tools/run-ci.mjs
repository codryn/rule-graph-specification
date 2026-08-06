import { spawnSync } from "node:child_process";

const exactMode = process.argv.includes("--exact");

const commands = [
  ...(exactMode
    ? [{ label: "Install dependencies", command: "npm", args: ["ci"] }]
    : []),
  {
    label: "Check formatting",
    command: "npm",
    args: ["run", "format:check"]
  },
  { label: "Lint repository", command: "npm", args: ["run", "lint"] },
  {
    label: "Validate repository",
    command: "npm",
    args: ["run", "validate"]
  },
  { label: "Run tests", command: "npm", args: ["test"] },
  {
    label: "Build workspace packages",
    command: "npm",
    args: ["run", "build"]
  }
];

for (const step of commands) {
  console.log(`\n==> ${step.label}`);

  const result = runCommand(step.command, step.args, process.cwd());

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    if (
      process.platform === "win32" &&
      step.command === "npm" &&
      step.args[0] === "ci"
    ) {
      console.error(
        "\nWindows note: 'npm ci' can fail locally when native binaries in node_modules are locked by another process."
      );
      console.error(
        "Close editors, test watchers, and terminals using this workspace, then rerun 'npm run ci:exact'."
      );
      console.error(
        "If the lock persists, a reboot or antivirus exclusion for the workspace may be required."
      );
    }

    process.exit(result.status ?? 1);
  }
}

function runCommand(command, args, cwd) {
  if (process.platform === "win32") {
    return spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", quoteForCmd([command, ...args])],
      {
        cwd,
        stdio: "inherit",
        encoding: "utf8"
      }
    );
  }

  return spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    encoding: "utf8"
  });
}

function quoteForCmd(parts) {
  return parts
    .map((part) =>
      /[\s"&|<>^()]/.test(part) ? `"${part.replace(/(["\\])/g, "\\$1")}"` : part
    )
    .join(" ");
}
