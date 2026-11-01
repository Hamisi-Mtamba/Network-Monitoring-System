import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize, timeout } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
interface Settings { enabled: boolean; vendor: string; buyer_email: string; api_key_present: boolean; api_secret_present: boolean; }
interface Response { success: boolean; payment: Settings; message?: string; }
@Component({selector:'app-selcom-settings',standalone:true,imports:[ReactiveFormsModule],templateUrl:'./selcom-settings.component.html',styleUrl:'./selcom-settings.component.scss'})
export class SelcomSettingsComponent implements OnChanges, OnDestroy {
  @Input() companyId?: number;
  private readonly http=inject(HttpClient);
  private readonly fb=inject(FormBuilder);
  private requests=new Subscription();
  readonly loading=signal(true); readonly busy=signal(false); readonly error=signal(''); readonly message=signal('');
  readonly saved=signal<Settings|null>(null);
  readonly form=this.fb.nonNullable.group({enabled:[false],vendor:['',[Validators.required,Validators.pattern(/^[a-zA-Z0-9_-]{1,100}$/)]],buyer_email:['',[Validators.required,Validators.email,Validators.maxLength(254)]],api_key:['',Validators.maxLength(4096)],api_secret:['',Validators.maxLength(4096)]});
  private get url():string { return this.companyId===undefined ? `${API_CONFIG.baseUrl}/company/payment-settings` : `${API_CONFIG.platformUrl}/companies/${this.companyId}/payment-settings`; }
  // A newly selected tenant gets a fresh request and no previous credentials or state.
  ngOnChanges():void {this.load();}
  ngOnInit():void {if(this.companyId===undefined)this.load();}
  ngOnDestroy():void {this.requests.unsubscribe();this.form.reset();}
  load():void {
    this.requests.unsubscribe();this.requests=new Subscription();this.saved.set(null);this.form.reset();this.error.set('');this.message.set('');this.loading.set(true);
    this.requests.add(this.http.get<Response>(this.url).pipe(timeout(20000),finalize(()=>this.loading.set(false))).subscribe({next:r=>this.populate(r.payment),error:()=>this.error.set('Payment settings could not be loaded. Try again.')}));
  }
  private populate(settings:Settings):void {this.saved.set(settings);this.form.reset({enabled:settings.enabled,vendor:settings.vendor,buyer_email:settings.buyer_email,api_key:'',api_secret:''});}
  save():void {
    if(this.busy()||!this.saved())return;
    this.form.markAllAsTouched();this.error.set('');this.message.set('');
    const value=this.form.getRawValue();
    if(this.form.invalid){this.error.set('Enter a valid vendor ID and buyer email.');return;}
    if((!this.saved()?.api_key_present&&!value.api_key.trim())||(!this.saved()?.api_secret_present&&!value.api_secret.trim())){this.error.set('Enter both the API key and API secret for initial setup.');return;}
    // Blank credentials preserve the encrypted values already stored on the server.
    const payment={enabled:value.enabled,vendor:value.vendor.trim(),buyer_email:value.buyer_email.trim(),...(value.api_key.trim()?{api_key:value.api_key.trim()}:{}),...(value.api_secret.trim()?{api_secret:value.api_secret.trim()}:{})};
    this.busy.set(true);
    this.requests.add(this.http.patch<Response>(this.url,{payment}).pipe(timeout(20000),finalize(()=>this.busy.set(false))).subscribe({next:r=>{this.populate(r.payment);this.message.set('Selcom settings saved.');},error:e=>{this.form.patchValue({api_key:'',api_secret:''});this.error.set(e.error?.message||'Save could not be confirmed. Reload settings before trying again.');}}));
  }
  test():void {
    if(this.busy()||!this.saved()?.api_key_present||this.form.dirty)return;
    this.busy.set(true);this.error.set('');this.message.set('');
    this.requests.add(this.http.post<{success:boolean;message:string}>(`${this.url}/test`,{}).pipe(timeout(25000),finalize(()=>this.busy.set(false))).subscribe({next:r=>this.message.set(r.message),error:e=>this.error.set(e.error?.message||'Connection could not be verified.')}));
  }
}
