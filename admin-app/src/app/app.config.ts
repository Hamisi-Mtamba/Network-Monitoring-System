import { AdminRouteReuseStrategy } from './services/admin-route-reuse';
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';

import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Ionic routing strategy
    {
      provide: RouteReuseStrategy,
      useClass: AdminRouteReuseStrategy,
    },

    // Configure Ionic
    provideIonicAngular({
      mode: 'md',
    }),

    // Register application routes
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // Enable HttpClient and attach the JWT interceptor
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
