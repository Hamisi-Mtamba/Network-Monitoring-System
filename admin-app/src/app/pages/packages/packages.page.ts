import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonDatetime,
  IonIcon,
  IonInput,
  IonModal,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  calendarOutline,
  closeOutline,
  createOutline,
  searchOutline,
  timeOutline,
  wifiOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { InternetPackage, PackagePayload } from '../../models/package.model';
import { PackageService } from '../../services/package.service';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonButton,
    IonDatetime,
    IonIcon,
    IonInput,
    IonModal,
    IonSpinner,
    IonToggle,
  ],
  templateUrl: './packages.page.html',
  styleUrl: './packages.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackagesPage {
  private readonly service = inject(PackageService);
  private readonly ui = inject(UiService);
  private readonly fb = inject(FormBuilder);

  readonly packages = signal<InternetPackage[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal<number | null>(null);
  readonly error = signal(false);
  readonly search = signal('');
  readonly formOpen = signal(false);
  readonly scheduleOpen = signal(false);
  readonly selected = signal<InternetPackage | null>(null);

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return !term
      ? this.packages()
      : this.packages().filter((item) =>
          `${item.name} ${item.speed}`.toLowerCase().includes(term),
        );
  });

  readonly packageForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    price: [0, [Validators.required, Validators.min(1)]],
    duration_minutes: [60, [Validators.required, Validators.min(1)]],
    speed: ['Standard'],
    is_active: [true],
  });

  readonly scheduleForm = this.fb.group({
    available_from: ['', Validators.required],
    available_until: ['', Validators.required],
  });

  constructor() {
    addIcons({
      addOutline,
      calendarOutline,
      closeOutline,
      createOutline,
      searchOutline,
      timeOutline,
      wifiOutline,
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service
      .getPackages()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.packages.set(response.packages ?? []),
        error: () => this.error.set(true),
      });
  }

  openCreate(): void {
    this.selected.set(null);
    this.packageForm.reset({
      name: '',
      price: 0,
      duration_minutes: 60,
      speed: 'Standard',
      is_active: true,
    });
    this.formOpen.set(true);
  }

  openEdit(item: InternetPackage): void {
    this.selected.set(item);
    this.packageForm.reset({
      name: item.name,
      price: Number(item.price),
      duration_minutes: item.duration_minutes,
      speed: item.speed || 'Standard',
      is_active: item.is_active,
    });
    this.formOpen.set(true);
  }

  async savePackage(): Promise<void> {
    if (this.packageForm.invalid) {
      this.packageForm.markAllAsTouched();
      this.ui.warning('Please complete the package form', 'Enter a name, a price and a duration of at least 1 minute.');
      return;
    }
    if (this.saving()) return;

    const raw = this.packageForm.getRawValue();
    const payload: PackagePayload = { ...raw, speed: raw.speed?.trim() || 'Standard' };
    const editing = this.selected();

    if (!editing) {
      const confirmed = await this.ui.confirmAction({
        title: 'Create this package?',
        message: 'Please review the package details. It will be available to customers if marked active.',
        details: [
          { label: 'Package', value: payload.name.trim() },
          { label: 'Price', value: this.money(payload.price) },
          { label: 'Duration', value: `${this.duration(payload.duration_minutes)} (${payload.duration_minutes} minutes)` },
          { label: 'Customer availability', value: payload.is_active ? 'Active' : 'Hidden' },
        ],
        confirmLabel: 'Create package',
      });
      if (!confirmed) return;
    }

    this.saving.set(true);
    const request = editing
      ? this.service.updatePackage(editing.id, payload)
      : this.service.createPackage(payload);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.load();
        this.ui.success(
          editing ? 'Package updated successfully' : 'Package created successfully',
          `${payload.name.trim()} — ${this.money(payload.price)}`,
        );
      },
      error: (error) =>
        this.ui.apiError(
          editing ? 'Package could not be updated' : 'Package could not be created',
          error,
        ),
    });
  }

  async toggleStatus(
    item: InternetPackage,
    nextStatus: boolean,
  ): Promise<void> {
    const confirmed = await this.ui.confirm(
      nextStatus ? 'Activate package?' : 'Deactivate package?',
      `${item.name} will be ${nextStatus ? 'available' : 'hidden'} in the customer portal.`,
      nextStatus ? 'Activate' : 'Deactivate',
    );
    if (!confirmed) return;
    this.service.setStatus(item.id, nextStatus).subscribe({
      next: async () => {
        this.packages.update((list) =>
          list.map((p) =>
            p.id === item.id ? { ...p, is_active: nextStatus } : p,
          ),
        );
        await this.ui.toast(
          `Package ${nextStatus ? 'activated' : 'deactivated'}.`,
        );
      },
      error: () => this.ui.toast('Status could not be changed.', 'danger'),
    });
  }

  async deletePackage(item: InternetPackage): Promise<void> {
    if (this.deleting() !== null) return;
    const confirmed = await this.ui.confirm('Delete package?', `Delete ${item.name}? This cannot be undone.`, 'Delete');
    if (!confirmed || this.deleting() !== null) return;
    this.deleting.set(item.id);
    this.service.deletePackage(item.id).pipe(finalize(() => this.deleting.set(null))).subscribe({
      next: () => {
        this.packages.update(list => list.filter(pkg => pkg.id !== item.id));
        void this.ui.toast('Package deleted.');
      },
      error: error => void this.ui.toast(error.error?.message || 'Package could not be deleted.', 'danger'),
    });
  }

  openSchedule(item: InternetPackage): void {
    this.selected.set(item);
    this.scheduleForm.reset({
      available_from: item.available_from ?? '',
      available_until: item.available_until ?? '',
    });
    this.scheduleOpen.set(true);
  }

  saveSchedule(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    const from = this.scheduleForm.value.available_from!;
    const until = this.scheduleForm.value.available_until!;
    if (new Date(until) <= new Date(from)) {
      void this.ui.toast(
        'End time must be later than the start time.',
        'warning',
      );
      return;
    }
    this.updateSchedule(from, until, 'Availability schedule saved.');
  }

  removeSchedule(): void {
    this.updateSchedule(null, null, 'Availability schedule removed.');
  }

  private updateSchedule(
    from: string | null,
    until: string | null,
    message: string,
  ): void {
    const item = this.selected();
    if (!item) return;
    this.saving.set(true);
    this.service
      .setSchedule(item.id, from, until)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: async () => {
          this.scheduleOpen.set(false);
          this.load();
          await this.ui.toast(message);
        },
        error: () => this.ui.toast('Schedule could not be updated.', 'danger'),
      });
  }

  money(value: number | string): string {
    return `TZS ${Number(value).toLocaleString('en-TZ')}`;
  }
  duration(minutes: number): string {
    if (minutes % 10080 === 0)
      return `${minutes / 10080} week${minutes === 10080 ? '' : 's'}`;
    if (minutes % 1440 === 0)
      return `${minutes / 1440} day${minutes === 1440 ? '' : 's'}`;
    if (minutes % 60 === 0)
      return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
    return `${minutes} minutes`;
  }
}
