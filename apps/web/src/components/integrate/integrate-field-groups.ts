import type { IntegrateChannelField } from '../../lib/api'

export type IntegrateFieldSection = 'options' | 'credentials' | 'connection' | 'access' | 'agent'

export const INTEGRATE_SECTION_LABEL: Record<IntegrateFieldSection, string> = {
  options: 'Options',
  credentials: 'Credentials',
  connection: 'Connection',
  access: 'Access control',
  agent: 'Agent',
}

export const INTEGRATE_SECTION_ORDER: IntegrateFieldSection[] = [
  'options',
  'credentials',
  'connection',
  'access',
  'agent',
]

export function integrateFieldSection(field: IntegrateChannelField): IntegrateFieldSection {
  if (field.type === 'boolean') return 'options'
  if (field.type === 'prompt' || field.key === 'max_reply_chars') return 'agent'
  if (
    field.type === 'chat_ids' ||
    field.type === 'channel_ids' ||
    field.key.includes('allow') ||
    field.key === 'guild_id'
  ) {
    return 'access'
  }
  if (
    field.type === 'secret' ||
    field.key.includes('token') ||
    field.key.includes('password') ||
    field.key === 'signing_secret' ||
    field.key === 'public_key' ||
    field.key === 'application_id'
  ) {
    return 'credentials'
  }
  return 'connection'
}

export function groupIntegrateFields(
  fields: IntegrateChannelField[],
): Record<IntegrateFieldSection, IntegrateChannelField[]> {
  const groups: Record<IntegrateFieldSection, IntegrateChannelField[]> = {
    options: [],
    credentials: [],
    connection: [],
    access: [],
    agent: [],
  }
  for (const field of fields) {
    groups[integrateFieldSection(field)].push(field)
  }
  return groups
}
