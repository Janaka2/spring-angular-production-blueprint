import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ConfigService } from '../config';
import { AuthService } from './auth.service';

/** Attaches the bearer token to calls to our API only; never to any other host. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const { apiUrl } = inject(ConfigService).value;
  if (!req.url.startsWith(apiUrl)) return next(req);
  const token = auth.accessToken();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
