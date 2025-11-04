export function randomId(prefix = 'synt'): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${suffix}`;
}

export type RandomIdGenerator = (prefix?: string) => string;
