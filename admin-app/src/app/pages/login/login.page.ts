import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonCheckbox, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline, lockClosedOutline, mailOutline, radioOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
@Component({selector:'app-login',standalone:true,imports:[CommonModule,ReactiveFormsModule,IonButton,IonCheckbox,IonContent,IonIcon,IonInput,IonSpinner],templateUrl:'./login.page.html',styleUrl:'./login.page.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class LoginPage {
  private readonly fb=inject(FormBuilder);private readonly auth=inject(AuthService);private readonly router=inject(Router);private readonly route=inject(ActivatedRoute);
  readonly loading=signal(false);readonly showPassword=signal(false);readonly errorMessage=signal('');
  readonly form=this.fb.nonNullable.group({email:['',[Validators.required,Validators.email]],password:['',Validators.required]});
  constructor(){addIcons({eyeOffOutline,eyeOutline,lockClosedOutline,mailOutline,radioOutline,shieldCheckmarkOutline});}
  submit():void {
    if(this.loading())return;this.errorMessage.set('');this.form.markAllAsTouched();if(this.form.invalid)return;
    this.loading.set(true);const value=this.form.getRawValue();
    this.auth.login({...value,email:value.email.trim()}).subscribe({next:async()=>{
      const fallback=this.auth.isSuperAdmin()?'/platform/dashboard':'/dashboard';
      const requested=this.route.snapshot.queryParamMap.get('returnUrl')||'';
      const allowed=this.auth.isSuperAdmin()?/^\/platform\/(dashboard|companies)(\/|\?|$)/:/^\/(dashboard|payments|sessions|reports|settings)(\/|\?|$)/;
      try{const ok=await this.router.navigateByUrl(allowed.test(requested)?requested:fallback,{replaceUrl:true});if(!ok)this.errorMessage.set('Signed in, but the workspace could not open. Please try again.');}
      catch{this.errorMessage.set('The workspace could not open. Please try again.');}finally{this.loading.set(false);}
    },error:e=>{this.loading.set(false);this.errorMessage.set(e.error?.message||'Unable to sign in. Check your details and try again.');}});
  }
}
