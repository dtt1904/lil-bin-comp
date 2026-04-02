export function getPrismaErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function getPrismaErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const fallback = (error as { message?: unknown }).message;
    if (typeof fallback === "string") return fallback;
  }
  return "unknown";
}
