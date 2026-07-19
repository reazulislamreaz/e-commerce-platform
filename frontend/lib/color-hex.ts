const FALLBACK_HEX = '#111111';

/**
 * Resolves a human color name ("Black", "Navy", "Off White") to a six-digit
 * hex using the browser's CSS color parser, so admins don't have to enter
 * hex codes by hand. Unrecognized names fall back to a neutral dark swatch.
 */
export function colorNameToHex(name: string): string {
  if (typeof document === 'undefined') return FALLBACK_HEX;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return FALLBACK_HEX;

  // Strip spaces so multi-word names like "off white" match CSS keywords.
  const candidate = name.trim().toLowerCase().replace(/\s+/g, '');
  if (!candidate) return FALLBACK_HEX;

  // Invalid values leave fillStyle unchanged, so seed it with the fallback.
  context.fillStyle = FALLBACK_HEX;
  context.fillStyle = candidate;
  const parsed = context.fillStyle;
  return /^#[0-9a-f]{6}$/i.test(parsed) ? parsed : FALLBACK_HEX;
}
