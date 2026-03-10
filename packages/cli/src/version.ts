import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PackageManifest = {
  version?: string;
};

const packageJson = require("../package.json") as PackageManifest;

export const SEAL_CLI_VERSION = packageJson.version ?? "0.0.0";
