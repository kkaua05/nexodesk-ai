import { describe, expect, it } from "vitest";
import { temperatureFromScore } from "./enums";

describe("temperatureFromScore", () => {
  it.each([
    [0, "frio"],
    [30, "frio"],
    [31, "morno"],
    [60, "morno"],
    [61, "quente"],
    [80, "quente"],
    [81, "muito_quente"],
    [100, "muito_quente"],
  ] as const)("classifies score %i as %s", (score, expected) => {
    expect(temperatureFromScore(score)).toBe(expected);
  });
});
