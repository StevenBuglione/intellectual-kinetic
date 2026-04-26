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
  if (!existsSync(join(repoRoot, ".ref/lyx/CMakeLists.txt"))) {
    throw new Error(".ref/lyx source checkout is required for the source-built LyX oracle.");
  }

  if (process.env.IK_LYX_ORACLE_REBUILD === "1" || !(await dockerImageExists(imageName))) {
    await spawnChecked(
      "docker",
      [
        "build",
        "-f",
        "Dockerfile.lyx-oracle",
        "--build-context",
        "lyxsrc=.ref/lyx",
        "-t",
        imageName,
        ".",
      ],
      {
        cwd: repoRoot,
      },
    );
  } else {
    console.log(`Using existing ${imageName} image; set IK_LYX_ORACLE_REBUILD=1 to rebuild it.`);
  }
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

async function dockerImageExists(image) {
  try {
    await execFileAsync("docker", ["image", "inspect", image]);
    return true;
  } catch {
    return false;
  }
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

if (process.env.IK_LYX_ORACLE_USE_LOCAL === "1" && await commandExists("lyx")) {
  console.log("Running LyX oracle with local lyx binary because IK_LYX_ORACLE_USE_LOCAL=1.");
  await runLocalOracle();
} else {
  console.log("Running LyX oracle in Docker with the source-built .ref/lyx image.");
  await runDockerOracle();
}
