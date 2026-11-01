import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { helpCircleOutline, trashOutline, warningOutline } from 'ionicons/icons';
import { ConfirmationService } from '../../services/confirmation.service';

let dialogCounter = 0;

@Component({
  selector: 'app-global-confirm',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './global-confirm.component.html',
  styleUrl: './global-confirm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalConfirmComponent {
  protected readonly service = inject(ConfirmationService);

  protected readonly titleId = `confirm-title-${++dialogCounter}`;
  protected readonly descriptionId = `confirm-desc-${dialogCounter}`;

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');

  private opener: HTMLElement | null = null;

  constructor() {
    addIcons({ helpCircleOutline, trashOutline, warningOutline });

    effect(() => {
      const request = this.service.request();

      if (request) {
        this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        // Wait for the dialog to render, then move focus inside it.
        // Destructive dialogs focus Cancel so Enter cannot confirm by accident.
        setTimeout(() => {
          const target = request.tone === 'danger' ? this.cancelButton() : this.confirmButton();
          target?.nativeElement.focus();
        });
      } else if (this.opener) {
        const opener = this.opener;
        this.opener = null;
        setTimeout(() => opener.isConnected && opener.focus());
      }
    });
  }

  protected icon(tone: string): string {
    return tone === 'danger' ? 'trash-outline' : tone === 'warning' ? 'warning-outline' : 'help-circle-outline';
  }

  protected answer(confirmed: boolean): void {
    this.service.answer(confirmed);
  }

  protected backdrop(): void {
    if (!this.service.request()?.critical) this.service.answer(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.service.request()?.critical) {
      event.preventDefault();
      event.stopPropagation();
      this.service.answer(false);
      return;
    }

    if (event.key !== 'Tab') return;

    // Keep keyboard focus inside the dialog while it is open.
    const focusable = Array.from(
      this.dialog()?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [],
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
