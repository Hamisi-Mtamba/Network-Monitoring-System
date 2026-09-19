import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, CanActivateFn, Router, RouterLink } from '@angular/router';
import { catchError, map, of, timeout } from 'rxjs';
import { WifiContextService } from './wifi-context.service';
import { getCompanyPublicApiUrl } from '../config/api.config';

interface ReconnectResponse {
    state: 'active' | 'none' | 'suspended';
    session?: { id: number };
}

export const reconnectBeforePurchase: CanActivateFn = route => {
    const slug = route.paramMap.get('companySlug')!;
    const wifi = inject(WifiContextService).capture(slug, route.queryParamMap);
    if (!wifi) return true;
    const router = inject(Router);
    return inject(HttpClient).post<ReconnectResponse>(
        `${getCompanyPublicApiUrl(slug)}/sessions/reconnect`,
        { mac: wifi.mac, ip: wifi.ip, router: wifi.router }
    ).pipe(
        timeout(60_000),
        map(result => {
            if (result.state === 'active' && result.session?.id) {
                return router.createUrlTree(['/', slug, 'session', result.session.id]);
            }
            if (result.state === 'none') return true;
            return router.createUrlTree(['/', slug, 'connection-check'], {
                queryParams: { suspended: result.state === 'suspended' ? '1' : undefined }
            });
        }),
        catchError(() => of(router.createUrlTree(['/', slug, 'connection-check'])))
    );
};

@Component({
    standalone: true,
    imports: [RouterLink],
    template: `<section role="status">
        <h1>{{ suspended ? 'Internet access is suspended' : 'We could not check your internet access' }}</h1>
        <p>{{ suspended ? 'Please contact your Wi-Fi provider to reactivate your package.' : 'Please retry the connection check before buying another package.' }}</p>
        <a [routerLink]="['/', slug, 'packages']">Retry connection check</a>
    </section>`
})
export class ConnectionCheckPage {
    private readonly route = inject(ActivatedRoute);
    readonly slug = this.route.snapshot.paramMap.get('companySlug');
    readonly suspended = this.route.snapshot.queryParamMap.get('suspended') === '1';
}
