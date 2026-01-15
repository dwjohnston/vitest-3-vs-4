import { vi, describe, it, expect } from "vitest";
import * as foo from "./main";

// This only errors if we are on browser mode
vi.spyOn(foo, "foo");

it("passes", () => {
  expect(true).toBe(true);
});
