const COUNT = 5;

/** Muted member color, rotating by member index. */
export function memberColor(index: number) {
  return `var(--member-${(((index % COUNT) + COUNT) % COUNT) + 1})`;
}
