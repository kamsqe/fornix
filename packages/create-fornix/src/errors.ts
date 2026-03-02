// ── Base Error Shape ──────────────────────────────────────

interface BaseError {
  readonly kind: string;
  readonly message: string;
}

// ── Typed Error Enums ─────────────────────────────────────

export interface SchemaValidationError extends BaseError {
  readonly kind: "SchemaValidationError";
  readonly path: ReadonlyArray<string>;
}

export interface DependencyConflictError extends BaseError {
  readonly kind: "DependencyConflictError";
  readonly blockA: string;
  readonly blockB: string;
}

export interface CircularDependencyError extends BaseError {
  readonly kind: "CircularDependencyError";
  readonly chain: ReadonlyArray<string>;
}

export interface BlockNotFoundError extends BaseError {
  readonly kind: "BlockNotFoundError";
  readonly blockName: string;
}

export interface ProviderError extends BaseError {
  readonly kind: "ProviderError";
  readonly provider: string;
}

// ── Union Type ────────────────────────────────────────────

export type FornixError =
  | SchemaValidationError
  | DependencyConflictError
  | CircularDependencyError
  | BlockNotFoundError
  | ProviderError;
