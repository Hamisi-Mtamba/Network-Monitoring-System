import { Injectable, inject } from '@angular/core';
import { CanActivateFn, ParamMap } from '@angular/router';

export interface WifiConnectionContext {
    companySlug: string;
    mac: string;
    ip: string;
    router: string;
    loginUrl: string;
    originalUrl: string | null;
    capturedAt: string;
}

const STORAGE_KEY = 'nms_wifi_connection_context';
const FIELDS = ['mac', 'ip', 'router', 'loginUrl', 'originalUrl'] as const;

@Injectable({ providedIn: 'root' })
export class WifiContextService {
    private current: WifiConnectionContext | null = null;

    capture(companySlug: string, params: ParamMap): WifiConnectionContext | null {
        const slug = companySlug.trim().toLowerCase();
        // Any new captive context replaces the whole record. Never combine a
        // new device/router with missing fields from an older connection.
        if (FIELDS.some(field => params.has(field))) {
            const candidate = {
                companySlug: slug,
                mac: (params.get('mac') || '').trim().toUpperCase(),
                ip: (params.get('ip') || '').trim(),
                router: (params.get('router') || '').trim(),
                loginUrl: (params.get('loginUrl') || '').trim(),
                originalUrl: params.get('originalUrl'),
                capturedAt: new Date().toISOString()
            };
            this.current = this.valid(candidate) ? candidate : null;
            this.persist();
        }
        return this.get(slug);
    }

    get(companySlug: string): WifiConnectionContext | null {
        const slug = companySlug.trim().toLowerCase();
        if (!this.current) {
            try {
                const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
                if (this.valid(stored)) this.current = stored;
            } catch { /* Storage may be unavailable in captive/private browsers. */ }
        }
        if (this.current?.companySlug !== slug) {
            this.current = null;
            this.persist();
        }
        return this.current ? { ...this.current } : null;
    }

    private persist(): void {
        try {
            if (this.current) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
            else localStorage.removeItem(STORAGE_KEY);
        } catch { /* Keep the in-memory context when storage is unavailable. */ }
    }

    private valid(value: unknown): value is WifiConnectionContext {
        if (!value || typeof value !== 'object') return false;
        const context = value as WifiConnectionContext;
        if (![context.companySlug, context.mac, context.ip, context.router, context.loginUrl, context.capturedAt]
            .every(field => typeof field === 'string' && field.trim().length > 0)) return false;
        if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(context.mac)) return false;
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(context.ip) || context.ip.split('.').some(part => Number(part) > 255)) return false;
        if (!Number.isFinite(Date.parse(context.capturedAt))) return false;
        try {
            const url = new URL(context.loginUrl);
            return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
        } catch { return false; }
    }
}

export const captureWifiContext: CanActivateFn = route => {
    const slug = route.paramMap.get('companySlug');
    if (slug) inject(WifiContextService).capture(slug, route.queryParamMap);
    return true;
};
