import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { finalize, Observable } from 'rxjs';
import { Company, CompanyBrandingImage, getBrandingImages } from '../../models/company.model';
import { CompanyService } from '../../services/company.service';
import { API_CONFIG } from '../../config/api.config';

@Component({
    selector: 'app-branding-images',
    standalone: true,
    templateUrl: './branding-images.component.html',
    styleUrl: './branding-images.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandingImagesComponent {
    readonly company = input.required<Company>();
    readonly platform = input(false);
    readonly updated = output<Company>();
    readonly images = computed(() => getBrandingImages(this.company().settings?.branding));
    readonly busy = signal(false);
    readonly message = signal('');
    readonly error = signal('');
    private readonly service = inject(CompanyService);

    imageUrl(url: string): string {
        return /^https?:\/\//.test(url) ? url : `${API_CONFIG.backendUrl}${url}`;
    }

    async upload(event: Event, role: string): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file || this.busy() || (role !== 'banner' && role !== 'background')) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            this.error.set('Choose a JPG, PNG or WebP image up to 5 MB.');
            return;
        }
        this.error.set('');
        this.message.set('');
        if (role === 'banner') {
            if (file.size > 2 * 1024 * 1024) {
                this.error.set('Banner images must be 2 MB or smaller.');
                return;
            }
            const companyId = this.company().id;
            this.busy.set(true);
            const previewUrl = URL.createObjectURL(file);
            try {
                const image = new Image();
                await new Promise<void>((resolve, reject) => {
                    image.onload = () => resolve();
                    image.onerror = () => reject(new Error('Unable to read this image. Choose a valid JPG, PNG or WebP banner.'));
                    image.src = previewUrl;
                });
                const width = image.naturalWidth;
                const height = image.naturalHeight;
                if (width < 1200 || width > 3840 || height < 400 || height > 1920 || width / height < 2 || width / height > 3) {
                    throw new Error('Use a landscape banner 1200–3840 px wide and 400–1920 px high, with a width-to-height ratio between 2:1 and 3:1. Recommended: 1600 × 600 px.');
                }
            } catch (error) {
                if (this.company().id === companyId) this.error.set((error as Error).message);
                return;
            } finally {
                URL.revokeObjectURL(previewUrl);
                this.busy.set(false);
            }
            if (this.company().id !== companyId) return;
        }
        const request = this.platform()
            ? this.service.uploadCompanyBrandingImage(this.company().id, role, file, true)
            : this.service.uploadCurrentCompanyBrandingImage(role, file, true);
        this.save(request, 'Image uploaded.');
    }

    changeRole(image: CompanyBrandingImage, event: Event): void {
        const select = event.target as HTMLSelectElement;
        const role = select.value;
        select.value = image.role;
        if (this.busy() || role === image.role || (role !== 'banner' && role !== 'background')) return;
        this.save(this.service.updateBrandingImageRole(image.role, image.url, role,
            this.platform() ? this.company().id : undefined), 'Image role updated.');
    }

    remove(image: CompanyBrandingImage): void {
        if (this.busy()) return;
        this.save(this.platform()
            ? this.service.removeCompanyBrandingImage(this.company().id, image.role, image.url)
            : this.service.removeCurrentCompanyBrandingImage(image.role, image.url), 'Image removed.');
    }

    private save(request: Observable<{ company?: Company }>, message: string): void {
        const companyId = this.company().id;
        this.busy.set(true);
        this.error.set('');
        this.message.set('');
        request.pipe(finalize(() => this.busy.set(false))).subscribe({
            next: response => {
                if (this.company().id !== companyId) return;
                if (response.company) this.updated.emit(response.company);
                this.message.set(message);
            },
            error: error => {
                if (this.company().id === companyId) this.error.set(error?.error?.message || 'Unable to save image changes. Try again.');
            }
        });
    }
}
