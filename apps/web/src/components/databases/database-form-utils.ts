const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/

export type ColumnDraft = {
  name: string
  type: string
  nullable: boolean
  primary: boolean
  auto_increment: boolean
}

export function defaultCreateColumns(pluginId: string): ColumnDraft[] {
  if (pluginId === 'postgresql') {
    return [
      { name: 'id', type: 'BIGSERIAL', nullable: false, primary: true, auto_increment: false },
    ]
  }
  return [{ name: 'id', type: 'BIGINT', nullable: false, primary: true, auto_increment: true }]
}

export function validateIdent(value: string, label: string): string | null {
  const cleaned = value.trim()
  if (!cleaned) return `${label} is required`
  if (!IDENT_RE.test(cleaned)) {
    return `${label} must start with a letter and use only letters, digits, or underscore`
  }
  return null
}

export function validateCreateTablePayload(
  pluginId: string,
  tableName: string,
  columns: ColumnDraft[],
): string | null {
  const tableErr = validateIdent(tableName, 'Table name')
  if (tableErr) return tableErr
  const filled = columns.filter((c) => c.name.trim())
  if (!filled.length) return 'Add at least one column with a name'
  for (const col of filled) {
    const nameErr = validateIdent(col.name, 'Column name')
    if (nameErr) return nameErr
    if (!col.type.trim()) return `Column ${col.name}: data type is required`
    if (col.auto_increment && pluginId === 'mysql') {
      const base = col.type.split('(')[0]?.trim().toUpperCase()
      if (!['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT'].includes(base)) {
        return `Column ${col.name}: AUTO_INCREMENT needs an integer type (e.g. BIGINT)`
      }
    }
  }
  return null
}

export function formatApiDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        const row = entry as { loc?: (string | number)[]; msg?: string }
        const field = row.loc?.length ? String(row.loc[row.loc.length - 1]) : 'field'
        return `${field}: ${row.msg ?? 'invalid'}`
      })
      .join('; ')
  }
  if (detail && typeof detail === 'object') return JSON.stringify(detail)
  return 'Request failed'
}

export function errorMessageFromUnknown(err: unknown): string {
  if (err instanceof Error) {
    const raw = err.message
    const jsonStart = raw.indexOf(': [')
    if (jsonStart > 0) {
      try {
        const parsed = JSON.parse(raw.slice(jsonStart + 2)) as unknown
        return formatApiDetail(parsed)
      } catch {
        /* use full message */
      }
    }
    if (raw.startsWith('HTTP ')) {
      const colon = raw.indexOf(': ', raw.indexOf(' '))
      if (colon > 0) {
        const tail = raw.slice(colon + 2)
        try {
          return formatApiDetail(JSON.parse(tail) as unknown)
        } catch {
          return tail.replace(/^"|"$/g, '')
        }
      }
    }
    return raw
  }
  return String(err)
}
