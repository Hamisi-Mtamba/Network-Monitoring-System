import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  pauseCircleOutline,
  playCircleOutline,
  refreshOutline,
  searchOutline,
  wifiOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { InternetSession } from '../../models/session.model';
import { SessionService } from '../../services/session.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    IonButton,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
  ],
  templateUrl: './sessions.page.html',
  styleUrl: './sessions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsPage {
  private readonly service = inject(SessionService);
  private readonly ui = inject(UiService);
  readonly sessions = signal<InternetSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly query = signal('');
  readonly status = signal('all');
  readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    return this.sessions().filter(
      (s) =>
        (!q ||
          `${s.id} ${s.phone_number} ${s.transaction_reference} ${s.package_name}`
            .toLowerCase()
            .includes(q)) &&
        (this.status() === 'all' || s.status === this.status()),
    );
  });
  constructor() {
    addIcons({
      chevronForwardOutline,
      pauseCircleOutline,
      playCircleOutline,
      refreshOutline,
      searchOutline,
      wifiOutline,
    });
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service
      .getSessions()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.sessions.set(r.sessions ?? []),
        error: () => this.error.set(true),
      });
  }
  async changeStatus(item: InternetSession): Promise<void> {
    const next = item.status === 'suspended' ? 'active' : 'suspended';
    const confirmed = await this.ui.confirm(
      next === 'active' ? 'Reactivate session?' : 'Suspend session?',
      `${item.phone_number} will be ${next === 'active' ? 'allowed to reconnect' : 'temporarily blocked'}.`,
      next === 'active' ? 'Reactivate' : 'Suspend',
    );
    if (!confirmed) return;
    this.service.changeStatus(item.id, next).subscribe({
      next: async () => {
        this.sessions.update((list) =>
          list.map((s) => (s.id === item.id ? { ...s, status: next } : s)),
        );
        await this.ui.toast(
          `Session ${next === 'active' ? 'reactivated' : 'suspended'}.`,
        );
      },
      error: () =>
        this.ui.toast('Session status could not be changed.', 'danger'),
    });
  }
}
