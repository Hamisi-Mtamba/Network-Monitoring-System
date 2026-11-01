import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';
// Recreate detail pages when identifiers change; never retain the previous tenant's forms.
export class AdminRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(next:ActivatedRouteSnapshot,current:ActivatedRouteSnapshot):boolean {
    return next.routeConfig===current.routeConfig && ['companyId','id'].every(key=>next.paramMap.get(key)===current.paramMap.get(key));
  }
}
