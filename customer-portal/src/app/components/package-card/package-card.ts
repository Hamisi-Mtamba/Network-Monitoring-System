import { Component, input, output } from '@angular/core';

import { InternetPackage } from '../../models/package.model';
import { PackageService } from '../../services/package.service';

@Component({
  selector: 'app-package-card',
  standalone: true,
  templateUrl: './package-card.html',
  styleUrl: './package-card.css',
})
export class PackageCardComponent {
  readonly packageItem = input.required<InternetPackage>();
  readonly isSelected = input(false);
  readonly disabled = input(false);
  readonly selected = output<InternetPackage>();

  constructor(readonly packageService: PackageService) {}

  choosePackage(): void {
    if (this.disabled()) return;
    this.selected.emit(this.packageItem());
  }
}

