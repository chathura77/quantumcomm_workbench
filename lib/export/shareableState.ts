export function encodeShareableState(state: Record<string, unknown>) {
  return encodeURIComponent(JSON.stringify(state));
}

export function decodeShareableState<T>(value: string): T {
  return JSON.parse(decodeURIComponent(value)) as T;
}

export function buildShareableStateUrl(pathname: string, key: string, state: Record<string, unknown>) {
  const params = new URLSearchParams();
  params.set(key, encodeShareableState(state));
  return `${pathname}?${params.toString()}`;
}
