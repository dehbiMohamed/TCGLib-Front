import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { API_BASE_URL } from './Core/config/api-base-url.token';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverApiOrigin = (process.env['TCGLIB_API_URL'] ?? 'http://localhost:5059').replace(/\/$/, '');

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    {
      provide: API_BASE_URL,
      useValue: `${serverApiOrigin}/api`,
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
