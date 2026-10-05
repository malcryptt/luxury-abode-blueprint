/** Returns a short problem description, or null when the password is acceptable for a new account. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use both letters and numbers";
  if (/^(.)\1+$/.test(pw) || /^(password|12345678|qwertyui)/i.test(pw)) return "That password is too easy to guess";
  return null;
}
