import { describe, expect, it } from "vitest";
import { base64ToBytes, bytesToBase64 } from "./base64";

describe("binary base64 transport", () => {
  it("round-trips arbitrary binary bytes", () => {
    const input = new Uint8Array([0, 1, 2, 31, 127, 128, 200, 254, 255]);
    expect(base64ToBytes(bytesToBase64(input))).toEqual(input);
  });

  it("handles payloads larger than a spread-call chunk", () => {
    const input = new Uint8Array(100_000);
    for (let index = 0; index < input.length; index += 1) {
      input[index] = index % 256;
    }

    expect(base64ToBytes(bytesToBase64(input))).toEqual(input);
  });

  it("preserves empty payloads", () => {
    expect(base64ToBytes(bytesToBase64(new Uint8Array()))).toEqual(new Uint8Array());
  });
});
