import { vi } from "vitest";
import * as lodash from "lodash";

// This errors whether we are on browser mode or not.
vi.spyOn(lodash, "after");

it("passes", () => {
  expect(true).toBe(true);
});
