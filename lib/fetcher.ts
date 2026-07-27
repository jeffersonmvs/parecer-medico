export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new Error(
      (info as { error?: string }).error ?? `Erro ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}
