/** True for Firebase "this credential is bad" errors (auth/*), as opposed to infrastructure failures. */
export function isFirebaseAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
  );
}
