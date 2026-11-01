import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, timeout } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { Admin, AdminResponse, LoginRequest, LoginResponse } from '../models/admin.model';
import { CompanyService } from './company.service';
const TOKEN_KEY='isp_admin_token',ADMIN_KEY='isp_admin_user';
@Injectable({providedIn:'root'})
export class AuthService {
  private readonly http=inject(HttpClient);private readonly router=inject(Router);private readonly companies=inject(CompanyService);
  private readonly tokenState=signal<string|null>(this.read(TOKEN_KEY));
  private readonly adminState=signal<Admin|null>(this.readAdmin());
  readonly admin=this.adminState.asReadonly();readonly tokenSignal=this.tokenState.asReadonly();
  readonly isAuthenticated=computed(()=>Boolean(this.tokenState()&&this.valid(this.adminState())));
  readonly role=computed(()=>this.admin()?.role??null);
  readonly companyId=computed(()=>this.isCompanyAdmin()?this.admin()?.company_id??null:null);
  get token():string|null{return this.tokenState();}
  isSuperAdmin():boolean{return this.admin()?.role==='superadmin';}
  isCompanyAdmin():boolean{return this.admin()?.role==='admin';}
  getCompanyId():number|null{return this.companyId();}
  login(credentials:LoginRequest):Observable<LoginResponse>{
    return this.http.post<LoginResponse>(`${API_CONFIG.baseUrl}/auth/login`,credentials).pipe(timeout(20000),tap(r=>{
      if(!r.token||!this.valid(r.admin))throw new Error('Invalid administrator response');
      this.companies.clearCompany();this.tokenState.set(r.token);this.adminState.set(r.admin);this.persist();
    }));
  }
  loadCurrentAdmin():Observable<AdminResponse>{return this.http.get<AdminResponse>(`${API_CONFIG.baseUrl}/auth/me`).pipe(timeout(20000),tap(r=>{
    if(!this.valid(r.admin)){this.logout();throw new Error('Administrator access is unavailable');}
    this.adminState.set(r.admin);this.persist();
  }));}
  logout(redirect=true):void {this.tokenState.set(null);this.adminState.set(null);this.companies.clearCompany();try{sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(ADMIN_KEY);}catch{}if(redirect)void this.router.navigateByUrl('/login',{replaceUrl:true});}
  private valid(a:Admin|null):boolean{return !!a?.id&&['admin','superadmin'].includes(a.role)&&a.is_active!==false&&(!a.status||a.status==='active');}
  private read(key:string):string|null{try{return sessionStorage.getItem(key);}catch{return null;}}
  private readAdmin():Admin|null{try{const a=JSON.parse(this.read(ADMIN_KEY)||'null');return this.valid(a)?a:null;}catch{return null;}}
  // Storage restrictions must not turn an otherwise successful login into an error.
  private persist():void{try{sessionStorage.setItem(TOKEN_KEY,this.token!);sessionStorage.setItem(ADMIN_KEY,JSON.stringify(this.admin()));}catch{}}
}
