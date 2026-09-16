import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describe as describeError } from './error-handler';

describe('GlobalErrorHandler.describe', () => {
  it('classifies a chunk load failure so the user is asked to reload', () => {
    expect(describeError(new Error('Failed to fetch dynamically imported module: /chunk-ABC.js')).kind).toBe('chunk-load');
  });

  it('keeps the request id of an escaped HTTP error for the bug report', () => {
    const e = new HttpErrorResponse({ status: 500, headers: new HttpHeaders({ 'X-Request-Id': 'req-42' }), url: '/api/v1/assets' });
    const d = describeError(e);
    expect(d.kind).toBe('http');
    expect(d.status).toBe(500);
    expect(d.requestId).toBe('req-42');
  });

  it('unwraps a rejected promise', () => {
    const wrapped = Object.assign(new Error('Uncaught (in promise)'), { rejection: new Error('boom') });
    expect(describeError(wrapped)).toEqual({ kind: 'runtime', message: 'boom' });
  });
});
