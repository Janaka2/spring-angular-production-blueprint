/*
 * EXCERPT from AssetCare, (c) 2026 Janaka Premathilaka. All rights reserved.
 * Shown for viewing only. Not licensed for copying, modification or reuse; see LICENSE.
 * This file is part of a private codebase and is not a complete or buildable source.
 * Source: https://github.com/Janaka2/spring-angular-production-blueprint
 */

package me.janaka.assetcare.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Locale;
import org.jspecify.annotations.Nullable;

/** An amount with its ISO 4217 currency. Scale 2, never negative, never floating point. */
@Embeddable
public record Money(
        @Column(precision = 14, scale = 2) BigDecimal amount,
        @Column(length = 3) String currency) {

    public Money {
        if (amount.signum() < 0) throw new ValidationException("amount must not be negative");
        amount = amount.setScale(2, RoundingMode.HALF_UP);
        try {
            currency = Currency.getInstance(currency.toUpperCase(Locale.ROOT)).getCurrencyCode();
        } catch (IllegalArgumentException e) {
            throw new ValidationException("unknown currency " + currency);
        }
    }

    public static Money of(String amount, String currency) { return new Money(new BigDecimal(amount), currency); }

    public static @Nullable Money orNull(@Nullable BigDecimal amount, @Nullable String currency) {
        if (amount == null) return null;
        if (currency == null) throw new ValidationException("currency is required when an amount is given");
        return new Money(amount, currency);
    }
}
