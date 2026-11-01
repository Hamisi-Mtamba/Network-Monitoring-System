import { Injectable, signal } from '@angular/core';

export type ConfirmTone = 'default' | 'warning' | 'danger';

export interface ConfirmDetail {
  label: string;
  value: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Key/value rows shown so the admin can review what will be affected. */
  details?: ConfirmDetail[];
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** When true, Escape and backdrop clicks do not dismiss the dialog. */
  critical?: boolean;
}

export interface ConfirmRequest extends Required<Pick<ConfirmOptions, 'title' | 'confirmLabel' | 'cancelLabel' | 'tone' | 'critical'>> {
  message?: string;
  details: ConfirmDetail[];
  resolve: (confirmed: boolean) => void;
}

/**
 * Single source of truth for confirmation dialogs.
 * Rendered by GlobalConfirmComponent (mounted once in AppComponent).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly request = signal<ConfirmRequest | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    // A new request cancels any dialog that is still open.
    this.request()?.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.request.set({
        title: options.title,
        message: options.message,
        details: options.details ?? [],
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        tone: options.tone ?? 'default',
        critical: options.critical ?? false,
        resolve,
      });
    });
  }

  answer(confirmed: boolean): void {
    const current = this.request();
    if (!current) return;
    this.request.set(null);
    current.resolve(confirmed);
  }
}
