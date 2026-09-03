// Import Angular component utilities
import {
    Component,
    inject
} from '@angular/core';


// Import router utilities
import {
    RouterLink,
    RouterOutlet
} from '@angular/router';


// Import tenant/company service
import {
    TenantService
} from './services/tenant.service';


// Import API helper for uploaded company files
import {
    getPublicFileUrl
} from './config/api.config';


@Component({
    selector: 'app-root',

    standalone: true,

    imports: [
        RouterOutlet,
        RouterLink
    ],

    templateUrl: './app.html',

    styleUrl: './app.css'
})
export class App {

    // Current company/tenant state
    readonly tenantService =
        inject(TenantService);


    // Convert company logo paths into browser-safe URLs
    readonly getPublicFileUrl =
        getPublicFileUrl;
}