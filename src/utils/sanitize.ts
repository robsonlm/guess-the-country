export const PLAYER_NAME_MAX_LENGTH = 24;
export const PLAYER_NAME_DEFAULT = "World Explorer";

const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;

export function sanitizePlayerName(raw: string | null | undefined): string {
  if (typeof raw !== "string") return PLAYER_NAME_DEFAULT;
  const trimmed = raw.trim();
  if (!trimmed) return PLAYER_NAME_DEFAULT;
  if (CONTROL_CHAR_REGEX.test(trimmed)) {
    return PLAYER_NAME_DEFAULT;
  }
  if (trimmed.length > PLAYER_NAME_MAX_LENGTH) {
    return trimmed.slice(0, PLAYER_NAME_MAX_LENGTH);
  }
  return trimmed;
}

export function hasControlCharacters(raw: string | null | undefined): boolean {
  return typeof raw === "string" && CONTROL_CHAR_REGEX.test(raw);
}

export function safeId(prefix: string = "entry"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
