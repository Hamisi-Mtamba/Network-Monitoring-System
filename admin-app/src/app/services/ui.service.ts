import { inject, Injectable } from '@angular/core';
import { ConfirmationService, ConfirmOptions } from './confirmation.service';
import { NotificationService } from './notification.service';

// Legacy confirm() callers pass only a button label, so destructive wording is
// detected to give those dialogs the red treatment automatically.
const DESTRUCTIVE_LABEL = /\b(delete|remove|suspend|end|deactivate|terminate|revoke)\b/i;

/**
 * Backward-compatible facade used by every admin page.
 * All visuals are rendered by the global toast/confirm components, so pages
 * never manage toast markup or modal state themselves.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly notifications = inject(NotificationService);
  private readonly confirmations = inject(ConfirmationService);

  // ---------- notifications ----------

  success(title: string, message?: string): void {
    this.notifications.success(title, message);
  }

  error(title: string, message?: string): void {
    this.notifications.error(title, message);
  }

  warning(title: string, message?: string): void {
    this.notifications.warning(title, message);
  }

  info(title: string, message?: string): void {
    this.notifications.info(title, message);
  }

  /** Shows a failure toast, preferring the backend's own message when present. */
  apiError(title: string, error: unknown): void {
    const message = (error as { error?: { message?: unknown } } | null)?.error?.message;
    this.notifications.error(title, typeof message === 'string' ? message : undefined);
  }

  /** Legacy signature kept so existing call sites keep working. */
  async toast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success',
  ): Promise<void> {
    this.notifications.show(color === 'danger' ? 'error' : color, message);
  }

  // ---------- confirmations ----------

  /** Rich confirmation with detail rows and tone. */
  confirmAction(options: ConfirmOptions): Promise<boolean> {
    return this.confirmations.confirm(options);
  }

  /** Legacy signature kept so existing call sites keep working. */
  confirm(header: string, message: string, actionLabel = 'Confirm'): Promise<boolean> {
    return this.confirmations.confirm({
      title: header,
      message,
      confirmLabel: actionLabel,
      tone: DESTRUCTIVE_LABEL.test(actionLabel) ? 'danger' : 'default',
    });
  }
}
