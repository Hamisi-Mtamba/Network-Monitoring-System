import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';
// A new tenant, payment or package receives fresh component state and fresh subscriptions.
@Injectable()
export class PortalRouteReuseStrategy extends BaseRouteReuseStrategy {
    override shouldReuseRoute(future:ActivatedRouteSnapshot,current:ActivatedRouteSnapshot):boolean {
        return future.routeConfig===current.routeConfig && ['companySlug','packageId','reference','id']
            .every(key=>future.paramMap.get(key)===current.paramMap.get(key));
    }
}
