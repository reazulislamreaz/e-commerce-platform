/**
 * Split a single "Full Name" value into first/last for User storage.
 * A single word becomes firstName with an empty lastName.
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const space = trimmed.indexOf(' ');
  if (space === -1) return { firstName: trimmed, lastName: '' };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1),
  };
}
