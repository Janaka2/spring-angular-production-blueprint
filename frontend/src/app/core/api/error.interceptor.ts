import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { asProblem } from './problem';

/**
 * Cross-cutting error handling: 401 restarts login, network and 5xx errors get a snackbar with the request id.
 * 4xx errors pass through untouched so the screen that caused them can show them in place.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snack = inject(MatSnackBar);
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          auth.login(window.location.pathname);
        } else if (err.status === 0) {
          snack.open('The server cannot be reached. Check your connection and try again.', 'Close', { duration: 6000 });
        } else if (err.status >= 500) {
          const id = asProblem(err)?.requestId;
          snack.open(`Something went wrong on the server${id ? ` (request ${id})` : ''}.`, 'Close', { duration: 8000 });
        }
      }
      return throwError(() => err);
    }),
  );
};
