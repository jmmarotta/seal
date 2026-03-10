import { buildApplication } from "@stricli/core";

import { routes } from "./routes";
import { SEAL_CLI_VERSION } from "./version";

export const app = buildApplication(routes, {
  name: "seal",
  versionInfo: {
    currentVersion: SEAL_CLI_VERSION,
  },
  scanner: { caseStyle: "allow-kebab-for-camel" },
});
