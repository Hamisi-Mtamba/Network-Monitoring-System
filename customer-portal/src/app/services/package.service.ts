import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { map } from 'rxjs';
import { getCompanyPublicApiUrl } from '../config/api.config';
import { InternetPackage, PackageApiResponse } from '../models/package.model';
@Injectable({providedIn:'root'})
export class PackageService {
    private readonly selected=signal<InternetPackage|null>(null);
    readonly selectedPackage=this.selected.asReadonly();
    readonly usingMockData=signal(false);
    constructor(private readonly http:HttpClient){}
    getPackages(slug:string) {
        return this.http.get<PackageApiResponse>(`${getCompanyPublicApiUrl(slug)}/packages`).pipe(map(response=>{
            const packages=Array.isArray(response)?response:'packages' in response?response.packages:response.data;
            return packages.map(p=>({...p,price:Number(p.price),duration_minutes:Number(p.duration_minutes)}))
                .sort((a,b)=>a.price-b.price || a.id-b.id);
        }));
    }
    getPackageById(slug:string,id:number){return this.getPackages(slug).pipe(map(items=>items.find(item=>Number(item.id)===id)));}
    selectPackage(item:InternetPackage):void {this.selected.set(item);}
    formatDuration(minutes:number):string {
        for(const [size,name] of [[10080,'Week'],[1440,'Day'],[60,'Hour']] as const) {
            if(minutes>=size && minutes%size===0){const count=minutes/size;return `${count} ${name}${count===1?'':'s'}`;}
        }
        return `${minutes} Minute${minutes===1?'':'s'}`;
    }
}
