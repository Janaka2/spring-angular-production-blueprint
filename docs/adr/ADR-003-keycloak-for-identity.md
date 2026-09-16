# ADR-003: Keycloak for identity with OIDC Authorization Code + PKCE

**Status:** accepted · **Date:** 2026-09-16

## Context

Writing password authentication is a liability: storage, reset flows, MFA, brute-force protection, session handling. Enterprises federate identity anyway.

## Options

Keycloak; a hosted identity provider; Spring Security form login with a users table.

## Decision

Keycloak 26 as the OpenID Connect provider. The SPA is a public client using Authorization Code with PKCE (angular-oauth2-oidc). The API is a Spring Security resource server validating JWTs and mapping realm roles to USER, ADMIN, AUDITOR.

## Consequences

No passwords in the application. One more container to run. Realm configuration is versioned as a realm export with development-only credentials that are labelled as such.
