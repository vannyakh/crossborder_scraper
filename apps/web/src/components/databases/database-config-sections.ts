export type DatabaseConfigSectionId = 'database' | 'matrix' | 'credential' | 'danger'

export type DatabaseConfigSection = {
  id: DatabaseConfigSectionId
  labelKey: string
}

export const DATABASE_CONFIG_SECTIONS: DatabaseConfigSection[] = [
  { id: 'database', labelKey: 'db.config.nav.database' },
  { id: 'matrix', labelKey: 'db.config.nav.matrix' },
  { id: 'credential', labelKey: 'db.config.nav.credential' },
  { id: 'danger', labelKey: 'db.config.nav.danger' },
]
