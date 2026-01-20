import { vi, it, expect } from "vitest";
type AsyncFunction<R = unknown, TArgs extends unknown[] = never[]> = (
  ...args: TArgs
) => Promise<R>;
import { Mock } from "vitest";
import SomeClient from "./SomeClient";
import { ApiClient } from "./ApiClient";

/**
 * This whole file is a failed attempt at creating a reproduction of an issue I was facing.
 * 
 * The issue is that in v4 we start seeing vitest detecting unhandled errors. 
 * 
 * It's to do with returning a promise that rjects from an abort handler: 
 * 
    const legacyAbortablePromise = legacyCreateCancellablePromise();
    signal.addEventListener("abort", () => {
      return legacyAbortablePromise.reject(new Error("aborted"));
    });

    But in my reproductions here - this _always_ causes errors in both V3 and V4. 
    So not sure what, in my real world use, was causing the error from not propagating. 🤷
 */

vi.mock("./ApiClient");

const mockApiClient = vi.mocked(new ApiClient());
const quoteClient = new SomeClient(mockApiClient);

function legacyCreateCancellablePromise<T extends AsyncFunction>() {
  type TReturn = T extends AsyncFunction<infer R> ? R : never;

  let resolve: (value: TReturn) => void;
  let reject: (value: unknown) => void;

  let promise: Promise<TReturn>;

  const returnFun = <
    Mock & {
      complete: (args: TReturn) => Promise<TReturn>;
      reject: (args?: unknown) => Promise<unknown>;
    }
  >vi.fn().mockImplementation(() => {
    promise = new Promise<TReturn>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return promise;
  });
  returnFun.complete = (args: TReturn) => {
    resolve(args);
    return promise;
  };
  returnFun.reject = (args?: unknown) => {
    reject(args);
    return promise;
  };

  return returnFun;
}

// Consistently passes

it("promise rejection v1", async () => {
  const createAbortablePromise = (signal: AbortSignal) => {
    const promiseWithResolvers = Promise.withResolvers();
    signal.addEventListener("abort", () => {
      promiseWithResolvers.reject(new Error("aborted"));
    });

    return promiseWithResolvers;
  };

  const abortController = new AbortController();
  const signal = abortController.signal;

  const promiseWithResolvers = createAbortablePromise(signal);

  promiseWithResolvers.reject("foo");
  await expect(promiseWithResolvers.promise).rejects.toThrow();
});

// Consistently passes
it("promise rejection v2", async () => {
  const createAbortablePromise = (signal: AbortSignal) => {
    const promiseWithResolvers = Promise.withResolvers();
    signal.addEventListener("abort", () => {
      promiseWithResolvers.reject(new Error("aborted"));
    });

    return promiseWithResolvers;
  };

  const abortController = new AbortController();
  const signal = abortController.signal;

  const promiseWithResolvers = createAbortablePromise(signal);

  abortController.abort();

  await expect(promiseWithResolvers.promise).rejects.toThrow();
});

// Consistently passes
it("promise rejection v3", async () => {
  const createAbortablePromise = (signal: AbortSignal) => {
    const legacyAbortablePromise = legacyCreateCancellablePromise();
    signal.addEventListener("abort", () => {
      legacyAbortablePromise.reject(new Error("aborted"));
    });

    return legacyAbortablePromise();
  };

  const abortController = new AbortController();
  const signal = abortController.signal;

  const thePromise = createAbortablePromise(signal);

  abortController.abort();

  await expect(thePromise).rejects.toThrow();
});

// Consistently passes
it("promise rejection v4", async () => {
  const createAbortablePromise = (
    signal: AbortSignal,
    value: { foo: boolean },
  ) => {
    const promiseWithResolvers = Promise.withResolvers<{ foo: boolean }>();
    signal?.addEventListener("abort", () => {
      promiseWithResolvers.reject(new Error("aborted"));
    });

    setTimeout(() => {
      promiseWithResolvers.resolve(value);
    }, 100);

    return promiseWithResolvers;
  };
  mockApiClient.fn.mockImplementationOnce(
    (signal) => createAbortablePromise(signal, { foo: true }).promise,
  );
  mockApiClient.fn.mockImplementationOnce(
    (signal) => createAbortablePromise(signal, { foo: false }).promise,
  );

  const result1 = quoteClient.requestQuotes({ concurrencyKey: "a" });
  const result2 = quoteClient.requestQuotes({ concurrencyKey: "a" });

  await expect(result1).rejects.toThrow();
  await expect(result2).resolves.toEqual({ foo: false });
});

// Consistenly fails
it("promise rejection v5", async () => {
  const createAbortablePromise = (
    signal: AbortSignal | null,
    value: { foo: boolean },
  ) => {
    const manualPromise = legacyCreateCancellablePromise();

    signal?.addEventListener("abort", () => {
      manualPromise.reject(new Error("aborted"));

      // Switch between the two to see the the test error or not
      // return manualPromise.reject(new Error("aborted"));
    });

    setTimeout(() => {
      manualPromise.complete(value);
    }, 100);

    return manualPromise();
  };

  mockApiClient.fn.mockImplementationOnce((signal) =>
    createAbortablePromise(signal ?? null, { foo: true }),
  );
  mockApiClient.fn.mockImplementationOnce((signal) =>
    createAbortablePromise(signal ?? null, { foo: false }),
  );

  const result1 = quoteClient.requestQuotes({ concurrencyKey: "a" });
  const result2 = quoteClient.requestQuotes({ concurrencyKey: "a" });

  await expect(result1).rejects.toThrow();
  await expect(result2).resolves.toEqual({ foo: false });
});

// Consistenly fails
it("promise rejection v6", async () => {
  const createAbortablePromise = (signal: AbortSignal | null) => {
    const manualPromise = legacyCreateCancellablePromise();

    signal?.addEventListener("abort", () => {
      return manualPromise.reject(new Error("aborted"));
    });

    return manualPromise();
  };

  const fn = legacyCreateCancellablePromise();

  mockApiClient.fn.mockImplementationOnce((signal) =>
    createAbortablePromise(signal ?? null),
  );
  mockApiClient.fn.mockImplementationOnce(fn);

  const result1 = quoteClient.requestQuotes({ concurrencyKey: "a" });
  const result2 = quoteClient.requestQuotes({ concurrencyKey: "a" });

  await expect(result1).rejects.toThrow();
  fn.complete({});

  expect(await result2).toEqual(expect.any(Object));
});
