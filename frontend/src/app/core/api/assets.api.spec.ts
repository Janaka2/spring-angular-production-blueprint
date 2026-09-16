import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssetsApi } from './assets.api';
import { ConfigService } from '../config';
import { AssetRequest } from './models';

const request: AssetRequest = {
  name: 'Laptop',
  description: null,
  assetTag: 'LAPTOP-1',
  serialNumber: null,
  categoryId: 'cat-1',
  manufacturer: null,
  model: null,
  purchaseDate: null,
  purchasePrice: null,
  currency: null,
  warrantyUntil: null,
  location: null,
  notes: null,
};

describe('AssetsApi', () => {
  let api: AssetsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigService, useValue: { value: { apiUrl: 'http://api.test', issuer: '', clientId: '' } } },
      ],
    });
    api = TestBed.inject(AssetsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the Idempotency-Key on create and captures the ETag', () => {
    let etag = '';
    api.create(request, 'key-1234-5678').subscribe((r) => (etag = r.etag));
    const req = http.expectOne('http://api.test/api/v1/assets');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-1234-5678');
    req.flush({ id: 'a1', version: 0 }, { headers: { ETag: '"0"' } });
    expect(etag).toBe('"0"');
  });

  it('sends If-Match on update', () => {
    api.update('a1', '"3"', request).subscribe();
    const req = http.expectOne('http://api.test/api/v1/assets/a1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('If-Match')).toBe('"3"');
    req.flush({ id: 'a1', version: 4 }, { headers: { ETag: '"4"' } });
  });

  it('builds list query parameters and omits empty filters', () => {
    api.list({ search: 'mac', status: '', categoryId: '', includeArchived: false, page: 2, size: 10, sort: 'name,asc' }).subscribe();
    const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/assets');
    expect(req.request.params.get('search')).toBe('mac');
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('sort')).toBe('name,asc');
    req.flush({ items: [], page: 2, size: 10, totalItems: 0, totalPages: 0 });
  });
});
