import { buildApplication } from "@stricli/core";

import { routes } from "./routes";

export const app = buildApplication(routes, {
  name: "seal",
  versionInfo: {
    currentVersion: "0.1.0",
  },
  scanner: { caseStyle: "allow-kebab-for-camel" },
});
