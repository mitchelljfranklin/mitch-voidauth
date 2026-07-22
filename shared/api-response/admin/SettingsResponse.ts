export type SettingsResponse = {
  APP_TITLE: string | null
  APP_COLOR: string | null
  APP_FONT: string | null
  CONTACT_EMAIL: string | null
  DEFAULT_REDIRECT: string | null
  SIGNUP: boolean
  SIGNUP_REQUIRES_APPROVAL: boolean
  EMAIL_VERIFICATION: boolean
  MFA_REQUIRED: boolean
  PASSWORD_STRENGTH: number
  API_RATELIMIT: number
  ADMIN_EMAILS: string | null
  DEFAULT_USER_EXPIRES_IN: string | null
  SMTP_FROM: string | null
  APP_LOGO: string | null
}
