import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const imageName = "intellectual-kinetic-lyx-oracle";

async function commandExists(command) {
  try {
    await execFileAsync("bash", ["-lc", `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
}

async function runLocalOracle() {
  await spawnChecked(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "verify:lyx-oracle:local"],
    {
      cwd: repoRoot,
      env: { ...process.env, IK_RUN_REAL_LYX_ORACLE: "1" },
    },
  );
}

async function runDockerOracle() {
  if (!existsSync(join(repoRoot, "Dockerfile.lyx-oracle"))) {
    throw new Error("Dockerfile.lyx-oracle is missing.");
  }

  await spawnChecked("docker", ["build", "-f", "Dockerfile.lyx-oracle", "-t", imageName, "."], {
    cwd: repoRoot,
  });
  await spawnChecked(
    "docker",
    [
      "run",
      "--rm",
      "-e",
      "IK_RUN_REAL_LYX_ORACLE=1",
      "-v",
      `${repoRoot}:/workspace`,
      "-w",
      "/workspace",
      imageName,
      "npm",
      "run",
      "verify:lyx-oracle:local",
    ],
    {
      cwd: repoRoot,
    },
  );
}

async function spawnChecked(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with ${signal ?? `exit code ${code}`}.`));
    });
  });
}

if (await commandExists("lyx")) {
  console.log("Running LyX oracle with local lyx binary.");
  await runLocalOracle();
} else {
  console.log("Local lyx binary not found; running LyX oracle in Docker.");
  await runDockerOracle();
}
