# ADR-004: Kubernetes via K3s on an OCI Always Free ARM VM

> Part of the [AssetCare showcase](https://github.com/Janaka2/spring-angular-production-blueprint). © 2026 Janaka Premathilaka, all rights reserved, view only (see LICENSE). File paths mentioned below refer to the private AssetCare source.

**Status:** superseded by ADR-012 (2026-09-23) · **Date:** 2026-09-16

## Context

The deployment must be real Kubernetes so the manifests transfer to OKE, EKS, AKS, GKE or OpenShift, and it must be free.

## Options

Managed Kubernetes (costs money); a VM with docker compose (not Kubernetes); K3s on a free ARM VM.

## Decision

K3s (Kubernetes 1.37) on one VM.Standard.A1.Flex instance with Traefik and cert-manager. The same Helm chart targets any conformant cluster.

## Consequences

Real Kubernetes API, Helm, ingress and TLS for free. Not highly available: one node, one disk. PRODUCTION-GAPS.md states this plainly. All images must be linux/arm64.
