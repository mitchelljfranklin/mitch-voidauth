import { db } from './db'
import type { Flag } from '@shared/db/Flag'
import { TABLES } from '@shared/db'
import { logger } from '../util/logger'
import zod from 'zod'
import type { SettingsResponse } from '@shared/api-response/admin/SettingsResponse'

const SETTING_PREFIX = 'SETTING_'

type SettingKey =
  | 'APP_TITLE'
  | 'APP_COLOR'
  | 'APP_FONT'
  | 'CONTACT_EMAIL'
  | 'DEFAULT_REDIRECT'
  | 'SIGNUP'
  | 'SIGNUP_REQUIRES_APPROVAL'
  | 'EMAIL_VERIFICATION'
  | 'MFA_REQUIRED'
  | 'PASSWORD_STRENGTH'
  | 'API_RATELIMIT'
  | 'ADMIN_EMAILS'
  | 'DEFAULT_USER_EXPIRES_IN'
  | 'SMTP_FROM'
  | 'APP_LOGO'

function flagName(key: SettingKey): string {
  return `${SETTING_PREFIX}${key}`
}

export async function getSetting(key: SettingKey): Promise<string | null> {
  const flag = await db().table<Flag>(TABLES.FLAG).select('value').where({ name: flagName(key) }).first()
  return flag?.value ?? null
}

export async function setSetting(key: SettingKey, value: string | null): Promise<void> {
  await db().table<Flag>(TABLES.FLAG)
    .insert({
      name: flagName(key),
      value,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflict(['name'])
    .merge(['value', 'updatedAt'])

  logger({
    level: 'debug',
    message: `Setting updated: ${key}`,
  })
}

export async function getAllSettings(): Promise<SettingsResponse> {
  const flags = await db().table<Flag>(TABLES.FLAG)
    .select('name', 'value')
    .whereLike('name', `${SETTING_PREFIX}%`)

  const valueMap = new Map<string, string | null>()
  for (const flag of flags) {
    valueMap.set(flag.name, flag.value)
  }

  function getValue(key: SettingKey, fallback: string | null): string | null {
    return valueMap.get(flagName(key)) ?? fallback
  }

  function getBoolean(key: SettingKey, fallback: boolean): boolean {
    const raw = valueMap.get(flagName(key))
    if (raw != null) {
      return zod.stringbool().parse(raw)
    }
    return fallback
  }

  function getNumber(key: SettingKey, fallback: number): number {
    const raw = valueMap.get(flagName(key))
    if (raw != null) {
      return zod.coerce.number().parse(raw)
    }
    return fallback
  }

  const result: SettingsResponse = {
    APP_TITLE: getValue('APP_TITLE', null),
    APP_COLOR: getValue('APP_COLOR', null),
    APP_FONT: getValue('APP_FONT', null),
    CONTACT_EMAIL: getValue('CONTACT_EMAIL', null),
    DEFAULT_REDIRECT: getValue('DEFAULT_REDIRECT', null),
    SIGNUP: getBoolean('SIGNUP', false),
    SIGNUP_REQUIRES_APPROVAL: getBoolean('SIGNUP_REQUIRES_APPROVAL', true),
    EMAIL_VERIFICATION: getBoolean('EMAIL_VERIFICATION', false),
    MFA_REQUIRED: getBoolean('MFA_REQUIRED', false),
    PASSWORD_STRENGTH: getNumber('PASSWORD_STRENGTH', 3),
    API_RATELIMIT: getNumber('API_RATELIMIT', 60),
    ADMIN_EMAILS: getValue('ADMIN_EMAILS', null),
    DEFAULT_USER_EXPIRES_IN: getValue('DEFAULT_USER_EXPIRES_IN', null),
    SMTP_FROM: getValue('SMTP_FROM', null),
    APP_LOGO: getValue('APP_LOGO', null),
  }

  return result
}
