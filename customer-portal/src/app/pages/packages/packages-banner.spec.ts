import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { PackagesPageComponent } from './packages';
import { TenantService } from '../../services/tenant.service';
import { Company } from '../../models/company.model';
import { getPublicFileUrl } from '../../config/api.config';

describe('Package page company banner', () => {
    const company = signal<Company | null>(null);

    beforeEach(() => {
        company.set({ id: 1, name: 'Alpha', slug: 'alpha' });
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(), {
                provide: TenantService,
                useValue: { company, companySlug: () => 'alpha', loadCompany: () => of({}) }
            }]
        });
    });

    function render() {
        const fixture = TestBed.createComponent(PackagesPageComponent);
        fixture.detectChanges();
        fixture.componentInstance.loading.set(false);
        fixture.componentInstance.errorMessage.set('');
        fixture.detectChanges();
        return fixture;
    }

    it('keeps packages visible without an empty banner area', () => {
        const fixture = render();
        expect(fixture.nativeElement.querySelector('.portal-promotion')).toBeNull();
        expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Choose a package');
    });

    it('uses the uploaded banner URL and removes failed artwork', () => {
        company.update(value => ({ ...value!, settings: { branding: { banner_image_url: '/uploads/alpha/banner.png' } } }));
        const fixture = render();
        const img = fixture.nativeElement.querySelector('.portal-promotion img') as HTMLImageElement;
        expect(img.src).toBe(getPublicFileUrl('/uploads/alpha/banner.png'));
        img.dispatchEvent(new Event('error'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.portal-promotion')).toBeNull();
    });

    it('does not render artwork belonging to a different tenant', () => {
        company.set({ id: 2, name: 'Beta', slug: 'beta', settings: { branding: { banner_image_url: '/uploads/beta/banner.png' } } });
        const fixture = render();
        expect(fixture.nativeElement.querySelector('.portal-promotion')).toBeNull();
    });

    it('renders backgrounds separately from readable package content', () => {
        company.update(value => ({ ...value!, settings: { branding: { background_image_url: '/background.jpg' } } }));
        const fixture = render();
        expect(fixture.nativeElement.querySelector('.portal-promotion')).toBeNull();
        expect(fixture.nativeElement.querySelector('.package-backdrop img')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.package-backdrop h1')).toBeNull();
        fixture.nativeElement.querySelector('.package-backdrop img').dispatchEvent(new Event('error'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.package-backdrop')).toBeNull();
        expect(fixture.nativeElement.querySelector('.has-background')).toBeNull();
    });

    it('rotates multiple images, pauses, and cleans up its timer', () => {
        vi.useFakeTimers();
        try {
            company.update(value => ({ ...value!, settings: { branding: { images: [
                { url: '/banner1.jpg', role: 'banner' }, { url: '/banner2.jpg', role: 'banner' },
                { url: '/background1.jpg', role: 'background' }, { url: '/background2.jpg', role: 'background' }
            ] } } }));
            const fixture = render();
            const page = fixture.componentInstance;
            expect(page.bannerIndex()).toBe(0);
            vi.advanceTimersByTime(8000);
            fixture.detectChanges();
            expect(page.bannerIndex()).toBe(1);
            expect(page.backgroundIndex()).toBe(1);
            page.paused.set(true);
            fixture.detectChanges();
            vi.advanceTimersByTime(8000);
            expect(page.bannerIndex()).toBe(1);
            page.showBanner(1);
            expect(page.bannerIndex()).toBe(0);
            page.paused.set(false);
            fixture.detectChanges();
            const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
            fixture.destroy();
            expect(clearIntervalSpy).toHaveBeenCalled();
            const finalFrame = page.frame();
            vi.advanceTimersByTime(16000);
            expect(page.frame()).toBe(finalFrame);
            clearIntervalSpy.mockRestore();
        } finally { vi.useRealTimers(); }
    });

    it('does not auto-rotate when reduced motion is enabled', () => {
        vi.useFakeTimers();
        try {
            company.update(value => ({ ...value!, settings: { branding: { images: [
                { url: '/one.jpg', role: 'background' }, { url: '/two.jpg', role: 'background' }
            ] } } }));
            const fixture = render();
            fixture.componentInstance.reducedMotion.set(true);
            fixture.detectChanges();
            vi.advanceTimersByTime(16000);
            expect(fixture.componentInstance.backgroundIndex()).toBe(0);
            fixture.destroy();
        } finally { vi.useRealTimers(); }
    });
});
