// Both applications resolve the existing company.settings.branding contract here.
export interface BrandColors {
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  background_color?: string | null;
  navbar_color?: string | null;
}

export const PLATFORM_BRANDING = {
  primary_color: '#F05A22',
  accent_color: '#D44810',
  background_color: '#FAF8F5',
} as const;

const valid = (value: string | null | undefined, fallback: string): string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const luminance = (hex: string): number => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
};

// Brand colors are used as backgrounds and text; near-white values are unreadable on white surfaces.
const usable = (value: string | null | undefined, fallback: string): string => {
  const v = valid(value, fallback);
  return luminance(v) > .6 ? fallback : v;
};

export function brandContrast(hex: string): string {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .45 ? '#1E2022' : '#FFFFFF';
}

export function resolveBranding(branding: BrandColors = {}): Record<string, string> {
  const primary = usable(branding.primary_color, PLATFORM_BRANDING.primary_color);
  const accent = usable(branding.accent_color, usable(branding.secondary_color, PLATFORM_BRANDING.accent_color));
  const navbar = primary;
  const background = valid(branding.background_color, PLATFORM_BRANDING.background_color);
  return {
    '--company-primary': primary,
    '--company-secondary': accent,
    '--company-accent': accent,
    '--company-background': background,
    '--company-navbar': navbar,
    '--company-surface': '#FFFFFF',
    '--company-text': '#1E2022',
    '--on-primary': brandContrast(primary),
    '--on-navbar': brandContrast(navbar),
    '--brand-soft': `color-mix(in srgb, ${primary} 8%, #FAF8F5)`,
    '--brand-ink': `color-mix(in srgb, ${primary} 60%, #1E2022)`,
    '--brand-border': `color-mix(in srgb, ${primary} 12%, #E8E5DF)`,
    '--brand-muted': '#6B7280',
    '--ion-color-primary-rgb': [1, 3, 5].map(i => parseInt(primary.slice(i, i + 2), 16)).join(','),
    '--ion-color-primary-shade': `color-mix(in srgb, ${primary} 88%, black)`,
    '--ion-color-primary-tint': `color-mix(in srgb, ${primary} 90%, white)`,
  };
}

export function applyCompanyBranding(branding?: BrandColors): void {
  for (const [key, value] of Object.entries(resolveBranding(branding))) {
    document.documentElement.style.setProperty(key, value);
  }
}
