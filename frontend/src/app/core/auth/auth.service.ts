import { computed, Injectable, inject, signal } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { ConfigService } from '../config';

export type Role = 'USER' | 'ADMIN' | 'AUDITOR';

export interface CurrentUser {
  subject: string;
  name: string;
  roles: Role[];
}

/**
 * OpenID Connect through Keycloak: Authorization Code with PKCE, refresh tokens for silent renewal.
 * Roles here only shape the UI; the API enforces them again on every request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oauth = inject(OAuthService);
  private readonly config = inject(ConfigService);
  private readonly ready = signal(false);

  readonly user = signal<CurrentUser | null>(null);
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));
  readonly isAuditor = computed(() => this.hasRole('AUDITOR') && !this.hasRole('ADMIN'));
  readonly canWrite = computed(() => this.isLoggedIn() && !this.isAuditor());

  hasRole(role: Role): boolean {
    return this.user()?.roles.includes(role) ?? false;
  }

  /** Called once at startup: loads the discovery document and completes a login redirect if there is one. */
  async init(): Promise<void> {
    if (this.ready()) return;
    const { issuer, clientId } = this.config.value;
    const authConfig: AuthConfig = {
      issuer,
      clientId,
      redirectUri: window.location.origin + '/',
      postLogoutRedirectUri: window.location.origin + '/',
      responseType: 'code',
      scope: 'openid profile email',
      requireHttps: issuer.startsWith('https://'),
      showDebugInformation: false,
      clearHashAfterLogin: true,
    };
    this.oauth.configure(authConfig);
    this.oauth.setupAutomaticSilentRefresh();
    await this.oauth.loadDiscoveryDocumentAndTryLogin();
    this.removeIssuerParam();
    this.readUser();
    this.oauth.events.subscribe(() => this.readUser());
    this.ready.set(true);
  }

  login(returnTo?: string): void {
    this.oauth.initCodeFlow(returnTo);
  }

  logout(): void {
    this.user.set(null);
    this.oauth.logOut();
  }

  accessToken(): string | null {
    return this.oauth.hasValidAccessToken() ? this.oauth.getAccessToken() : null;
  }

  /** Where the user wanted to go before the login redirect, if anywhere. */
  consumeReturnTo(): string | null {
    const state = this.oauth.state;
    return state ? decodeURIComponent(state) : null;
  }

  /**
   * Keycloak 26 adds the RFC 9207 `iss` parameter to the login redirect. The library removes code and state but
   * leaves `iss`, which the router would then carry to /dashboard. Runs before the first navigation.
   */
  private removeIssuerParam(): void {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('iss')) return;
    url.searchParams.delete('iss');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }

  private readUser(): void {
    if (!this.oauth.hasValidAccessToken()) {
      this.user.set(null);
      return;
    }
    const claims = this.oauth.getIdentityClaims() as Record<string, unknown> | null;
    const token = this.decode(this.oauth.getAccessToken());
    const realmAccess = token['realm_access'] as { roles?: string[] } | undefined;
    const roles = (realmAccess?.roles ?? []).filter((r): r is Role => r === 'USER' || r === 'ADMIN' || r === 'AUDITOR');
    this.user.set({
      subject: String(token['sub'] ?? ''),
      name: String(claims?.['preferred_username'] ?? token['preferred_username'] ?? 'user'),
      roles,
    });
  }

  private decode(jwt: string): Record<string, unknown> {
    try {
      const payload = jwt.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
