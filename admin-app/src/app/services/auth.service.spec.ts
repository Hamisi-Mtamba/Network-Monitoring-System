import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { CompanyService } from './company.service';
describe('Administrator authentication',()=>{
 let auth:AuthService,http:HttpTestingController;
 const admin={id:2,company_id:1,name:'Mwita',email:'admin@example.test',role:'admin',status:'active',is_active:true};
 beforeEach(()=>{sessionStorage.clear();TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});auth=TestBed.inject(AuthService);http=TestBed.inject(HttpTestingController);});
 afterEach(()=>{http.verify();sessionStorage.clear();});
 it('makes the authenticated role available before login navigation',()=>{let ready=false;auth.login({email:admin.email,password:'test-pass'}).subscribe(()=>ready=auth.isAuthenticated()&&auth.isCompanyAdmin());http.expectOne('/api/admin/auth/login').flush({token:'test-token',admin});expect(ready).toBeTrue();});
 it('allows login when browser storage is unavailable',()=>{spyOn(sessionStorage,'setItem').and.throwError('blocked');let ok=false;auth.login({email:admin.email,password:'test-pass'}).subscribe(()=>ok=true);http.expectOne('/api/admin/auth/login').flush({token:'test-token',admin});expect(ok).toBeTrue();});
 it('rejects suspended accounts returned by login',()=>{let rejected=false;auth.login({email:admin.email,password:'test-pass'}).subscribe({error:()=>rejected=true});http.expectOne('/api/admin/auth/login').flush({token:'test-token',admin:{...admin,status:'suspended'}});expect(rejected).toBeTrue();expect(auth.isAuthenticated()).toBeFalse();});
 it('clears tenant branding on logout',()=>{const companies=TestBed.inject(CompanyService);companies.setCompany({id:1,name:'Test',slug:'test',status:'active'});auth.logout(false);expect(companies.company()).toBeNull();expect(auth.token).toBeNull();});
});
