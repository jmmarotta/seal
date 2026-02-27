import { run } from "@stricli/core";

import { app } from "./app";

async function main() {
  await run(app, process.argv.slice(2), {
    process,
    async forCommand() {
      return { process, cwd: process.cwd() };
    },
  });
}

void main();
