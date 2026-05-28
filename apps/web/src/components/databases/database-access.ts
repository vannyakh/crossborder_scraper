export type DbAccessMode = 'local' | 'remote'

export const DB_ACCESS_OPTIONS: { value: DbAccessMode; labelKey: string }[] = [
  { value: 'local', labelKey: 'db.create.accessLocal' },
  { value: 'remote', labelKey: 'db.create.accessRemote' },
]
