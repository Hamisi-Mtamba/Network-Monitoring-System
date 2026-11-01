import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkCircle,
  closeCircle,
  closeOutline,
  informationCircle,
  warning,
} from 'ionicons/icons';
import { AppNotification, NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-global-toast',
  standalone: true,
  imports: [IonIcon],
  templateUrl: './global-toast.component.html',
  styleUrl: './global-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalToastComponent {
  protected readonly service = inject(NotificationService);

  constructor() {
    addIcons({ alertCircleOutline, checkmarkCircle, closeCircle, closeOutline, informationCircle, warning });
  }

  protected icon(type: AppNotification['type']): string {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  }

  protected label(type: AppNotification['type']): string {
    return { success: 'Success', error: 'Error', warning: 'Warning', info: 'Information' }[type];
  }
}
