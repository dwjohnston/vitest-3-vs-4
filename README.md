Reproduction for issue mentioned here:

https://github.com/vitest-dev/vitest/issues/9467

Instructions

Observe that vitest.config.ts does not have browser mode enabled.

run

```
npx vitest
```

observe that main.test.ts fails with:

```
 FAIL  src/main.test.ts [ src/main.test.ts ]
TypeError: Cannot spy on export "after". Module namespace is not configurable in ESM. See: https://vitest.dev/guide/browser/#limitations
 ❯ src/main.test.ts:5:4
      3|
      4| // This errors whether we are on browser mode or not.
      5| vi.spyOn(lodash, "after");
       |    ^
      6|
      7| it("passes", () => {

Caused by: TypeError: Cannot redefine property: after
 ❯ src/main.test.ts:5:4
```

Change vitest.config.ts to enable browser mode.

Observe that main.test.ts fails.

Observe that foo.test.ts now fails.
