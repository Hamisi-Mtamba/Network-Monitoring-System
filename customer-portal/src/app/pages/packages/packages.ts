// Import Angular component utilities
import {
    Component,
    computed,
    effect,
    DestroyRef,
    OnInit,
    inject,
    signal
} from '@angular/core';


// Import Angular routing utilities
import {
    ActivatedRoute,
    Router
} from '@angular/router';


// Import reusable loading component
import {
    LoadingSpinnerComponent
} from '../../components/loading-spinner/loading-spinner';


// Import package card component
import {
    PackageCardComponent
} from '../../components/package-card/package-card';


// Import package model
import {
    InternetPackage
} from '../../models/package.model';


// Import package service
import {
    PackageService
} from '../../services/package.service';


// Import tenant/company service
import {
    TenantService
} from '../../services/tenant.service';

import { getBrandingImages } from '../../models/company.model';
import { getPublicFileUrl } from '../../config/api.config';


@Component({
    selector: 'app-packages-page',

    standalone: true,

    imports: [
        LoadingSpinnerComponent,
        PackageCardComponent
    ],

    templateUrl: './packages.html',

    styleUrl: './packages.css'
})
export class PackagesPageComponent
    implements OnInit {

    // Packages displayed on this page
    readonly packages =
        signal<InternetPackage[]>([]);


    // Loading state
    readonly loading =
        signal(true);

    readonly selectingPackageId = signal<InternetPackage['id'] | null>(null);
    readonly selectionError = signal('');


    // Error message shown in the UI
    readonly errorMessage =
        signal('');


    // Access current route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access Angular router
    private readonly router =
        inject(Router);


    // Access package API/state
    readonly packageService =
        inject(PackageService);


    // Access current company/tenant state
    readonly tenantService =
        inject(TenantService);

    readonly failedImageUrls = signal<string[]>([]);
    readonly frame = signal(0);
    readonly paused = signal(false);
    readonly reducedMotion = signal(false);
    readonly portalImages = computed(() => {
        const company = this.tenantService.company();
        if (this.loading() || this.errorMessage() ||
            company?.slug !== this.tenantService.companySlug()) return [];
        return getBrandingImages(company?.settings?.branding)
            .map(image => ({ ...image, url: getPublicFileUrl(image.url.trim())! }))
            .filter(image => image.url && !this.failedImageUrls().includes(image.url));
    });
    readonly banners = computed(() => this.portalImages().filter(image => image.role === 'banner'));
    readonly backgrounds = computed(() => this.portalImages().filter(image => image.role === 'background'));
    readonly bannerIndex = computed(() => this.frame() % Math.max(1, this.banners().length));
    readonly backgroundIndex = computed(() => this.frame() % Math.max(1, this.backgrounds().length));
    readonly rotating = computed(() => this.banners().length > 1 || this.backgrounds().length > 1);

    constructor() {
        const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        this.reducedMotion.set(media?.matches ?? false);
        const onMotion = () => this.reducedMotion.set(media?.matches ?? false);
        media?.addEventListener('change', onMotion);
        inject(DestroyRef).onDestroy(() => media?.removeEventListener('change', onMotion));
        effect(onCleanup => {
            const rotate = this.rotating();
            // Restart the timer when the tenant image collection changes.
            this.portalImages();
            const stopped = this.paused() || this.reducedMotion();
            if (!rotate || stopped) return;
            const timer = setInterval(() => {
                if (!document.hidden) this.frame.update(value => value + 1);
            }, 8000);
            onCleanup(() => clearInterval(timer));
        });
    }

    imageFailed(url: string): void {
        this.failedImageUrls.update(urls => [...urls, url]);
    }

    showBanner(direction: number): void {
        this.paused.set(true);
        // Manual navigation uses the same counter, with a positive modulo.
        this.frame.update(value => (value + direction + this.banners().length) % this.banners().length);
    }


    // Load company and packages when page opens
    ngOnInit(): void {

        // Read company slug from URL
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Stop when the URL does not contain a company
        if (!companySlug) {

            this.loading.set(false);

            this.errorMessage.set(
                'Company was not specified.'
            );

            return;
        }


        // Load the company first
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                next: () => {

                    // Company exists, so load its packages
                    this.loadPackages(
                        companySlug
                    );
                },


                error: () => {

                    this.loading.set(false);

                    this.errorMessage.set(
                        'This Wi-Fi provider is unavailable.'
                    );
                }
            });
    }


    // Load packages belonging to one company
    private loadPackages(
        companySlug: string
    ): void {

        // Start loading state
        this.loading.set(true);

        // Clear any old error
        this.errorMessage.set('');


        // Request packages from tenant-specific backend endpoint
        this.packageService
            .getPackages(companySlug)
            .subscribe({

                next: (packages) => {

                    // Store returned packages
                    this.packages.set(
                        packages
                    );

                    // Finish loading
                    this.loading.set(false);
                },


                error: (error) => {

                    // Log actual development error
                    console.error(
                        'Failed to load packages:',
                        error
                    );

                    // Finish loading
                    this.loading.set(false);

                    // Show customer-friendly error
                    this.errorMessage.set(
                        'Unable to load internet packages.'
                    );
                }
            });
    }


    // Customer selects one internet package
    async choosePackage(
        packageItem: InternetPackage
    ): Promise<void> {
        if (this.selectingPackageId() !== null) return;

        // Save selected package for checkout
        this.packageService
            .selectPackage(
                packageItem
            );


        // Get current company slug
        const companySlug =
            this.tenantService.companySlug();


        // Stop when company context is unavailable
        if (!companySlug) {

            this.errorMessage.set(
                'Company information is unavailable.'
            );

            return;
        }


        // Continue to the payment page while preserving tenant context
        this.selectingPackageId.set(packageItem.id);
        this.selectionError.set('');
        try {
            const navigated = await this.router.navigate(
                ['/', companySlug, 'payment', packageItem.id],
                { queryParamsHandling: 'preserve' });
            if (!navigated) {
                this.selectionError.set('Unable to open payment. Please choose your package again.');
            }
        } catch {
            this.selectionError.set('Unable to open payment. Please choose your package again.');
        } finally {
            this.selectingPackageId.set(null);
        }
    }
}
