import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function decode(output: ArrayBufferLike | Uint8Array): string {
  return Buffer.from(output).toString("utf8");
}

function run(
  cmd: string[],
  options: {
    cwd: string;
    env?: Record<string, string | undefined>;
  },
): string {
  const result = Bun.spawnSync(cmd, {
    cwd: options.cwd,
    env: options.env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = decode(result.stdout);
  const stderr = decode(result.stderr);

  assert(
    result.exitCode === 0,
    [`Command failed: ${cmd.join(" ")}`, stdout, stderr].filter(Boolean).join("\n\n"),
  );

  return stdout;
}

function assertNoWorkspaceRuntimeDeps(packageJson: Record<string, unknown>): void {
  for (const field of ["dependencies", "optionalDependencies", "peerDependencies"] as const) {
    const deps = packageJson[field];
    if (!deps || typeof deps !== "object") {
      continue;
    }

    for (const [name, version] of Object.entries(deps)) {
      assert(
        typeof version !== "string" || !version.startsWith("workspace:"),
        `Packed CLI still has a workspace runtime dependency: ${name}@${String(version)}`,
      );
    }
  }
}

function parsePackResult(output: string): [{ filename?: string }] {
  const lines = output.trim().split(/\r?\n/);

  for (let start = lines.length - 1; start >= 0; start -= 1) {
    const candidate = lines.slice(start).join("\n").trim();
    if (!candidate) {
      continue;
    }

    try {
      return JSON.parse(candidate) as [{ filename?: string }];
    } catch {
      continue;
    }
  }

  throw new Error(`npm pack did not emit parseable JSON:\n\n${output}`);
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dir, "..");
  const cliDir = path.join(repoRoot, "packages", "cli");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "seal-cli-install-"));

  try {
    const packDir = path.join(tempRoot, "pack");
    await fs.mkdir(packDir, { recursive: true });

    const packOutput = run(["npm", "pack", "--json", "--pack-destination", packDir], {
      cwd: cliDir,
    });
    const packResult = parsePackResult(packOutput);
    const tarballName = packResult[0]?.filename;

    assert(typeof tarballName === "string" && tarballName.length > 0, "npm pack did not return a tarball name");

    const tarballPath = path.join(packDir, tarballName);
    const packedManifest = run(["tar", "-xOf", tarballPath, "package/package.json"], {
      cwd: tempRoot,
    });

    assertNoWorkspaceRuntimeDeps(JSON.parse(packedManifest) as Record<string, unknown>);

    const projectDir = path.join(tempRoot, "project");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, "package.json"), '{"name":"seal-install-smoke","private":true}\n', "utf8");

    run(["bun", "add", tarballPath], { cwd: projectDir });
    const localBin = path.join(projectDir, "node_modules", ".bin", "seal");
    await fs.access(localBin);
    run([localBin, "--help"], { cwd: projectDir });

    const homeDir = path.join(tempRoot, "home");
    const bunInstallDir = path.join(tempRoot, ".bun");
    await fs.mkdir(homeDir, { recursive: true });

    const globalEnv = {
      ...process.env,
      HOME: homeDir,
      BUN_INSTALL: bunInstallDir,
    };

    run(["bun", "add", "-g", tarballPath], { cwd: tempRoot, env: globalEnv });
    const globalBin = path.join(bunInstallDir, "bin", "seal");
    await fs.access(globalBin);
    run([globalBin, "--help"], { cwd: tempRoot, env: globalEnv });
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

await main();
