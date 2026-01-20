import { describe, expect, it } from "vitest";

/**
 * This is a currently failing reproduction.
 */

describe("objectContainging", () => {
  it("does not match in v4", () => {
    const result = {
      data: {
        a: "hello",
        b: "world",
      },
    };

    expect(result).toEqual(
      expect.objectContaining({
        a: "world",
      }),
    );
  });
});
