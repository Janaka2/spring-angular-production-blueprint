# ADR-008: angular-oauth2-oidc for the SPA's OIDC client

> Part of the [AssetCare showcase](https://github.com/Janaka2/spring-angular-production-blueprint). © 2026 Janaka Premathilaka, all rights reserved, view only (see LICENSE). File paths mentioned below refer to the private AssetCare source.

**Status:** accepted · **Date:** 2026-09-16

## Context

The SPA must implement Authorization Code with PKCE correctly, refresh tokens safely, and attach bearer tokens to API calls.

## Options

keycloak-js (Keycloak's own adapter); angular-oauth2-oidc (certified, provider neutral); hand-written OIDC.

## Decision

angular-oauth2-oidc 22, configured for PKCE, silent refresh via refresh tokens, and an HTTP interceptor limited to the API origin.

## Consequences

Provider neutral: the SPA works against any OIDC provider, which matters for enterprises that use another IdP. Keycloak-specific features (account console links) are plain URLs.
