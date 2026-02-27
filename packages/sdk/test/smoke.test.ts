import { expect, test } from "bun:test";

import { SEAL_SDK_VERSION } from "../src/index";

test("exports sdk version", () => {
  expect(SEAL_SDK_VERSION).toBe("0.1.0");
});
