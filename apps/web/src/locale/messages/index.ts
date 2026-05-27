import type { AppLocale, MessageTree } from '../types'
import { en } from './en.ts'
import { km } from './km.ts'
import { zh } from './zh.ts'

export const messages: Record<AppLocale, MessageTree> = {
  en,
  zh,
  km,
}
