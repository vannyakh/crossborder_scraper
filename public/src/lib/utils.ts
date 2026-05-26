export function formatBytes(n: number) {
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
