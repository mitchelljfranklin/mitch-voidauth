import { Component, inject, type OnInit } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { AdminService } from '../../../services/admin.service'
import { SnackbarService } from '../../../services/snackbar.service'
import { SpinnerService } from '../../../services/spinner.service'
import { MaterialModule } from '../../../material-module'
import { TranslatePipe } from '@ngx-translate/core'
import { NgClass } from '@angular/common'

@Component({
  selector: 'app-settings',
  imports: [
    MaterialModule,
    ReactiveFormsModule,
    TranslatePipe,
    NgClass,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private adminService = inject(AdminService)
  private snackbarService = inject(SnackbarService)
  private spinnerService = inject(SpinnerService)
  private fb = inject(FormBuilder)

  logoUrl: string | null = null
  logoSaving = false

  settingsForm = this.fb.nonNullable.group({
    APP_TITLE: [''],
    APP_COLOR: ['', [Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
    APP_FONT: [''],
    CONTACT_EMAIL: [''],
    DEFAULT_REDIRECT: [''],
    SIGNUP: [false],
    SIGNUP_REQUIRES_APPROVAL: [false],
    EMAIL_VERIFICATION: [false],
    MFA_REQUIRED: [false],
    PASSWORD_STRENGTH: [3],
    API_RATELIMIT: [60],
    ADMIN_EMAILS: [''],
    DEFAULT_USER_EXPIRES_IN: [''],
    SMTP_FROM: [''],
  })

  async ngOnInit() {
    await this.loadSettings()
  }

  async loadSettings() {
    this.spinnerService.start()
    try {
      const settings = await this.adminService.settings()
      this.settingsForm.patchValue({
        APP_TITLE: settings.APP_TITLE ?? '',
        APP_COLOR: settings.APP_COLOR ?? '',
        APP_FONT: settings.APP_FONT ?? '',
        CONTACT_EMAIL: settings.CONTACT_EMAIL ?? '',
        DEFAULT_REDIRECT: settings.DEFAULT_REDIRECT ?? '',
        SIGNUP: settings.SIGNUP,
        SIGNUP_REQUIRES_APPROVAL: settings.SIGNUP_REQUIRES_APPROVAL,
        EMAIL_VERIFICATION: settings.EMAIL_VERIFICATION,
        MFA_REQUIRED: settings.MFA_REQUIRED,
        PASSWORD_STRENGTH: settings.PASSWORD_STRENGTH,
        API_RATELIMIT: settings.API_RATELIMIT,
        ADMIN_EMAILS: settings.ADMIN_EMAILS ?? '',
        DEFAULT_USER_EXPIRES_IN: settings.DEFAULT_USER_EXPIRES_IN ?? '',
        SMTP_FROM: settings.SMTP_FROM ?? '',
      })
      this.logoUrl = settings.APP_LOGO
    } catch (_error) {
      this.snackbarService.error('Failed to load settings')
    } finally {
      this.spinnerService.stop()
    }
  }

  async saveSettings() {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched()
      return
    }

    this.spinnerService.start()
    try {
      const values = this.settingsForm.value
      await this.adminService.updateSettings({
        APP_TITLE: values.APP_TITLE || null,
        APP_COLOR: values.APP_COLOR || null,
        APP_FONT: values.APP_FONT || null,
        CONTACT_EMAIL: values.CONTACT_EMAIL || null,
        DEFAULT_REDIRECT: values.DEFAULT_REDIRECT || null,
        SIGNUP: values.SIGNUP,
        SIGNUP_REQUIRES_APPROVAL: values.SIGNUP_REQUIRES_APPROVAL,
        EMAIL_VERIFICATION: values.EMAIL_VERIFICATION,
        MFA_REQUIRED: values.MFA_REQUIRED,
        PASSWORD_STRENGTH: values.PASSWORD_STRENGTH,
        API_RATELIMIT: values.API_RATELIMIT,
        ADMIN_EMAILS: values.ADMIN_EMAILS || null,
        DEFAULT_USER_EXPIRES_IN: values.DEFAULT_USER_EXPIRES_IN || null,
        SMTP_FROM: values.SMTP_FROM || null,
      })
      this.snackbarService.message('Settings saved')
    } catch (_error) {
      this.snackbarService.error('Failed to save settings')
    } finally {
      this.spinnerService.stop()
    }
  }

  async onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.match(/image\/(svg\+xml|png)/)) {
      this.snackbarService.error('Only SVG and PNG images are supported')
      return
    }

    this.logoSaving = true
    try {
      const result = await this.adminService.uploadLogo(file)
      this.logoUrl = result.logo
      this.snackbarService.message('Logo updated')
    } catch (_error) {
      this.snackbarService.error('Failed to upload logo')
    } finally {
      this.logoSaving = false
    }
  }
}
