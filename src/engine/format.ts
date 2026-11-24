/** 123400 → "12万3400両" */
export function formatRyo(n: number): string {
  const neg = n < 0;
  const a = Math.abs(Math.round(n));
  const man = Math.floor(a / 10000);
  const rest = a % 10000;
  let s: string;
  if (man > 0) s = rest > 0 ? `${man}万${rest}両` : `${man}万両`;
  else s = `${rest}両`;
  return neg ? `-${s}` : s;
}

export function signedRyo(n: number): string {
  return n >= 0 ? `+${formatRyo(n)}` : formatRyo(n);
}
