import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { GlobalConfirmComponent } from './components/global-confirm/global-confirm.component';
import { GlobalToastComponent } from './components/global-toast/global-toast.component';
@Component({selector:'app-root',standalone:true,templateUrl:'app.component.html',imports:[IonApp,RouterOutlet,GlobalToastComponent,GlobalConfirmComponent]})
export class AppComponent {}
