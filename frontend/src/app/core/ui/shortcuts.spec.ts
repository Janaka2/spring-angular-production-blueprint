import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Shortcuts } from './shortcuts';
import { AuthService } from '../auth/auth.service';

describe('Shortcuts', () => {
  let router: Router;
  let shortcuts: Shortcuts;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { canWrite: () => true } }],
    });
    router = TestBed.inject(Router);
    shortcuts = TestBed.inject(Shortcuts);
    shortcuts.install();
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  const press = (key: string, target: HTMLElement = document.body) => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true });
    Object.defineProperty(e, 'target', { value: target });
    document.dispatchEvent(e);
  };

  it('"g" then "a" goes to assets, "n" opens the new-asset form', () => {
    press('g');
    press('a');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/assets');
    press('n');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/assets/new');
  });

  it('does nothing while typing in a field', () => {
    const input = document.createElement('input');
    press('n', input);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('"/" asks for the search field and "?" for help', () => {
    press('/');
    press('?');
    expect(shortcuts.focusSearch()).toBe(1);
    expect(shortcuts.openHelp()).toBe(1);
  });
});
