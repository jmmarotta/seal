import { buildRouteMap } from "@stricli/core";

import { checkCommand } from "./commands/check";
import { editStatusCommand } from "./commands/edit-status";
import { initCommand } from "./commands/init";
import { listCommand } from "./commands/list";
import { newCommand } from "./commands/new";

const editRoutes = buildRouteMap({
  routes: {
    status: editStatusCommand,
  },
  docs: {
    brief: "Edit commands",
  },
});

export const routes = buildRouteMap({
  routes: {
    init: initCommand,
    new: newCommand,
    list: listCommand,
    edit: editRoutes,
    check: checkCommand,
  },
  docs: {
    brief: "SEAL CLI",
  },
});
