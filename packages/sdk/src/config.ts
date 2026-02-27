import { CONFIG_SCHEMA } from "./constants";
import { atomicWriteJson, ensureLayout, fileExists, readJsonFile } from "./io";
import { configPath } from "./paths";

export interface Config {
  specPrefix: string;
  schema?: string;
}

function normalizeSpecPrefix(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]*$/.test(normalized)) {
    throw new Error("specPrefix must start with a letter and contain only A-Z and 0-9");
  }
  return normalized;
}

export async function getConfig(rootDir?: string): Promise<Config | null> {
  const path = configPath(rootDir);
  if (!(await fileExists(path))) {
    return null;
  }

  const json = await readJsonFile(path);
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error(`Invalid SEAL config at ${path}`);
  }

  const specPrefix = (json as { specPrefix?: unknown }).specPrefix;
  if (typeof specPrefix !== "string") {
    throw new Error(`Invalid SEAL config at ${path}`);
  }

  return {
    specPrefix: normalizeSpecPrefix(specPrefix),
    schema:
      typeof (json as { schema?: unknown }).schema === "string"
        ? (json as { schema?: string }).schema
        : undefined,
  };
}

export async function setConfig(rootDir: string | undefined, config: Config): Promise<void> {
  if (!config || typeof config !== "object") {
    throw new Error("Invalid SEAL config payload");
  }

  const specPrefix = normalizeSpecPrefix(config.specPrefix);
  await ensureLayout(rootDir);
  await atomicWriteJson(configPath(rootDir), {
    schema: CONFIG_SCHEMA,
    specPrefix,
  });
}

export async function resolveSpecPrefix(
  rootDir: string | undefined,
  inputPrefix?: string,
): Promise<string> {
  const existing = await getConfig(rootDir);
  if (existing?.specPrefix) {
    return existing.specPrefix;
  }

  if (!inputPrefix) {
    throw new Error("Spec prefix not set. Run `seal init --prefix ABC`.");
  }

  const specPrefix = normalizeSpecPrefix(inputPrefix);
  await setConfig(rootDir, { specPrefix });
  return specPrefix;
}
