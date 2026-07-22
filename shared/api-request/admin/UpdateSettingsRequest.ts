import zod from 'zod'
import { type SchemaInfer, type SchemaInferInput } from '@shared/utils'

export const updateSettingsValidator = {
  APP_TITLE: zod.string().trim().nullable().optional(),
  APP_COLOR: zod.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex colour like #906bc7').nullable().optional(),
  APP_FONT: zod.string().trim().nullable().optional(),
  CONTACT_EMAIL: zod.string().trim().nullable().optional(),
  DEFAULT_REDIRECT: zod.string().trim().nullable().optional(),
  SIGNUP: zod.boolean().optional(),
  SIGNUP_REQUIRES_APPROVAL: zod.boolean().optional(),
  EMAIL_VERIFICATION: zod.boolean().optional(),
  MFA_REQUIRED: zod.boolean().optional(),
  PASSWORD_STRENGTH: zod.number().min(0).max(4).optional(),
  API_RATELIMIT: zod.number().positive().optional(),
  ADMIN_EMAILS: zod.string().trim().nullable().optional(),
  DEFAULT_USER_EXPIRES_IN: zod.string().trim().nullable().optional(),
  SMTP_FROM: zod.string().trim().nullable().optional(),
  APP_LOGO: zod.string().nullable().optional(),
}

export type UpdateSettingsRequest = SchemaInferInput<typeof updateSettingsValidator>

export type UpdateSettings = SchemaInfer<typeof updateSettingsValidator>
