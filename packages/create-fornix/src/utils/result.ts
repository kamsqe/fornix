// ── Result Type ───────────────────────────────────────────

export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

// ── Constructors ──────────────────────────────────────────

export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

export function err<T = never, E = unknown>(error: E): Result<T, E> {
  return { ok: false, error };
}

// ── Type Guards ───────────────────────────────────────────

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

// ── Unwrap ────────────────────────────────────────────────

export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  const errorMessage =
    typeof result.error === "string"
      ? result.error
      : result.error instanceof Error
        ? result.error.message
        : JSON.stringify(result.error);
  throw new Error(errorMessage);
}
