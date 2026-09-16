# ADR-009: Angular Signals and services for state, no NgRx

**Status:** accepted · **Date:** 2026-09-16

## Context

The application has a handful of screens over one API. A global store adds boilerplate and indirection that this complexity does not repay.

## Options

NgRx; Signals plus injectable services and resource(); component-local state only.

## Decision

Signals, signal-based forms, httpResource for reads and injectable services for shared state. NgRx is documented as the step to take if the state graph becomes genuinely cross-cutting.

## Consequences

Less code, easier onboarding, aligned with Angular 22's stable reactive APIs. The decision is revisited if several features need to coordinate the same client state.
