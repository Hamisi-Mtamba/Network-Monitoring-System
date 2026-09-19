export type PackageAccent = 'blue' | 'green' | 'purple' | 'orange';

export interface InternetPackage {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  // Kept for API/backward compatibility; intentionally not shown in the customer UI.
  speed?: string;
  is_active?: boolean;
  available_from?: string | null;
  available_until?: string | null;
  accent?: PackageAccent;
}

export type PackageApiResponse =
  | InternetPackage[]
  | { packages: InternetPackage[] }
  | { data: InternetPackage[] };
