/**
 * Token estimation.
 *
 * bandpass never calls a model, so it cannot count exact model tokens.
 * It estimates with a fixed, documented heuristic: 4 characters ≈ 1 token.
 * Every number bandpass reports is labeled an estimate.
 */

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
