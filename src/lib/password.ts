import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

const zxcvbn = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEnPackage.translations,
});

const MIN_LENGTH = 8;
const MIN_SCORE = 3; // zxcvbn score out of 0-4

export interface PasswordCheckResult {
  ok: boolean;
  reason?: string;
}

// Rejects passwords that are too short or too guessable (including plain
// dictionary words), per the subject's "no common English word" requirement.
export function checkPasswordStrength(
  password: string,
  userInputs: string[] = [],
): PasswordCheckResult {
  if (password.length < MIN_LENGTH) {
    return {
      ok: false,
      reason: `Access Code must be at least ${MIN_LENGTH} characters.`,
    };
  }

  const result = zxcvbn.check(password, userInputs);
  if (result.score < MIN_SCORE) {
    return {
      ok: false,
      reason:
        result.feedback.warning ||
        "Access Code is too weak or too common. Use a longer, less predictable phrase.",
    };
  }

  return { ok: true };
}
