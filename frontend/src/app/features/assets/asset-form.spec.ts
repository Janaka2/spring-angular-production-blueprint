import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AssetForm } from './asset-form';
import { AssetsApi } from '../../core/api/assets.api';
import { Confirm } from '../../shared/confirm-dialog';
import { AuthService } from '../../core/auth/auth.service';

describe('AssetForm', () => {
  const api = {
    categories: vi.fn(() => of([{ id: 'cat-1', code: 'COMPUTER', name: 'Computer', description: null, active: true, sortOrder: 1 }])),
    create: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
  };
  const confirm = { ask: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetForm],
      providers: [
        provideRouter([
          { path: 'assets/:id', children: [] },
          { path: 'assets', children: [] },
        ]),
        { provide: AssetsApi, useValue: api },
        { provide: Confirm, useValue: confirm },
        { provide: AuthService, useValue: { user: () => null } },
      ],
    }).compileComponents();
    api.create.mockReset();
    api.update.mockReset();
    api.get.mockReset();
    confirm.ask.mockReset();
  });

  it('does not submit an invalid form', async () => {
    const fixture = TestBed.createComponent(AssetForm);
    await fixture.whenStable();
    fixture.componentInstance.save();
    expect(api.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.name.hasError('required')).toBe(true);
  });

  it('creates with a fresh Idempotency-Key and normalised body', async () => {
    api.create.mockReturnValue(of({ body: { id: 'a1' }, etag: '"0"' }));
    const fixture = TestBed.createComponent(AssetForm);
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c.form.patchValue({ name: '  MacBook ', categoryId: 'cat-1', purchasePrice: 10, currency: 'chf', assetTag: ' ' });
    c.save();
    expect(api.create).toHaveBeenCalledTimes(1);
    const [body, key] = api.create.mock.calls[0] as [Record<string, unknown>, string];
    expect(body['name']).toBe('MacBook');
    expect(body['assetTag']).toBeNull();
    expect(body['currency']).toBe('CHF');
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('offers to reload on a stale-version conflict when editing', async () => {
    api.get.mockReturnValue(of({ body: { id: 'a1', name: 'Old', category: { id: 'cat-1' }, version: 1 }, etag: '"1"' }));
    const problem = new HttpErrorResponse({
      status: 409,
      error: { type: 'https://assetcare.janaka.me/problems/stale-version', status: 409, changedBy: 'bob' },
    });
    api.update.mockReturnValue(throwError(() => problem));
    confirm.ask.mockResolvedValue(false);
    const fixture = TestBed.createComponent(AssetForm);
    fixture.componentRef.setInput('id', 'a1');
    await fixture.whenStable();
    const c = fixture.componentInstance;
    c.form.patchValue({ name: 'New name' });
    c.save();
    await new Promise((r) => setTimeout(r, 0));
    expect(confirm.ask).toHaveBeenCalledTimes(1);
    expect(confirm.ask.mock.calls[0][0].message).toContain('bob');
    expect(c.formError()).toContain('changed by someone else');
  });
});
