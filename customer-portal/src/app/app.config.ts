// Import Angular application configuration utilities
import {
    ApplicationConfig,
    provideBrowserGlobalErrorListeners
} from '@angular/core';


// Import Angular router provider
import {
    provideRouter
} from '@angular/router';


// Import Angular HTTP provider so services can call the backend
import {
    provideHttpClient
} from '@angular/common/http';


// Import application routes
import {
    routes
} from './app.routes';


// Configure the Angular application
export const appConfig: ApplicationConfig = {

    providers: [

        // Enable Angular global error handling
        provideBrowserGlobalErrorListeners(),

        // Register application routes
        provideRouter(routes),

        // Enable HttpClient throughout the customer portal
        provideHttpClient()
    ]
};