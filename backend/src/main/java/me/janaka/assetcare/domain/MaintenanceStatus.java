package me.janaka.assetcare.domain;

/** Stored states. DUE and OVERDUE are derived from the due date at read time, not stored, so they never go stale. */
public enum MaintenanceStatus { PLANNED, DONE, CANCELLED }
