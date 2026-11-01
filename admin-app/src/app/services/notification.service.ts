import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message?: string;
  /** Milliseconds before auto-dismiss. 0 keeps the toast until dismissed. */
  duration: number;
}

export interface NotificationOptions {
  duration?: number;
}

// Success/info disappear quickly, warnings linger, errors stay until dismissed.
const DEFAULT_DURATION: Record<NotificationType, number> = {
  success: 3500,
  info: 4000,
  warning: 6000,
  error: 0,
};

const MAX_VISIBLE = 4;

/**
 * Single source of truth for global toast notifications.
 * Rendered by GlobalToastComponent (mounted once in AppComponent).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly notifications = signal<AppNotification[]>([]);

  success(title: string, message?: string, options?: NotificationOptions): number {
    return this.show('success', title, message, options);
  }

  error(title: string, message?: string, options?: NotificationOptions): number {
    return this.show('error', title, message, options);
  }

  warning(title: string, message?: string, options?: NotificationOptions): number {
    return this.show('warning', title, message, options);
  }

  info(title: string, message?: string, options?: NotificationOptions): number {
    return this.show('info', title, message, options);
  }

  show(
    type: NotificationType,
    title: string,
    message?: string,
    options: NotificationOptions = {},
  ): number {
    const text = title?.trim();
    if (!text) return -1;

    // Avoid stacking identical toasts when a user repeats an action quickly.
    const duplicate = this.notifications().find(
      (item) => item.type === type && item.title === text && item.message === message,
    );
    if (duplicate) {
      this.schedule(duplicate);
      return duplicate.id;
    }

    const notification: AppNotification = {
      id: this.nextId++,
      type,
      title: text,
      message: message?.trim() || undefined,
      duration: options.duration ?? DEFAULT_DURATION[type],
    };

    this.notifications.update((items) => {
      const next = [...items, notification];
      // Drop the oldest toasts if too many pile up.
      while (next.length > MAX_VISIBLE) {
        const removed = next.shift();
        if (removed) this.clearTimer(removed.id);
      }
      return next;
    });

    this.schedule(notification);
    return notification.id;
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.notifications.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.notifications.set([]);
  }

  /** Pause auto-dismiss while the pointer is over a toast. */
  pause(id: number): void {
    this.clearTimer(id);
  }

  resume(id: number): void {
    const item = this.notifications().find((entry) => entry.id === id);
    if (item) this.schedule(item);
  }

  private schedule(notification: AppNotification): void {
    this.clearTimer(notification.id);
    if (notification.duration > 0) {
      this.timers.set(
        notification.id,
        setTimeout(() => this.dismiss(notification.id), notification.duration),
      );
    }
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
