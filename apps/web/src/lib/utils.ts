export function formatBytes(n: number | null | undefined): string {
  if (n == null || n <= 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function parseUrls(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
}
