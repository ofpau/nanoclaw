/** Truncate a string without splitting multi-byte Unicode characters (emoji surrogate pairs). */
export function truncateUnicodeSafe(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  // If the char at the cut point is a high surrogate, back up one to avoid splitting the pair
  let end = maxLength;
  const code = str.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end--;
  return str.slice(0, end);
}
