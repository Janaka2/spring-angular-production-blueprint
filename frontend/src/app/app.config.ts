import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { routes } from './app.routes';
import { errorInterceptor } from './core/api/error.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { ConfigService } from './core/config';
import { GlobalErrorHandler } from './core/error-handler';
import { busyInterceptor } from './core/ui/busy';
import { AppTitleStrategy } from './core/ui/title.strategy';
import { PreferencesService } from './core/ui/preferences';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(withInterceptors([busyInterceptor, authInterceptor, errorInterceptor])),
    provideOAuthClient(),
    // config.json first, then the OIDC discovery document and any login redirect in the URL, then the app
    // inject() only works before the first await, so every dependency is taken up front
    provideAppInitializer(async () => {
      inject(PreferencesService); // applies the stored theme before the first paint
      const config = inject(ConfigService);
      const auth = inject(AuthService);
      await config.load();
      await auth.init();
    }),
  ],
};
