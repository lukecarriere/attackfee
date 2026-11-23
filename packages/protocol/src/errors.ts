export type AttackfeeErrorCode =
  | "malformed"
  | "unsupported"
  | "bad_sig"
  | "expired"
  | "not_yet_valid"
  | "wrong_site"
  | "wrong_action"
  | "replay"
  | "bad_solution"
  | "class_too_low"
  | "exhausted"
  | "store_unavailable"
  | "rate_limited";

export class AttackfeeError extends Error {
  code: AttackfeeErrorCode;
  constructor(code: AttackfeeErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "AttackfeeError";
  }
}
