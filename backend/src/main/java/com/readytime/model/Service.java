package com.readytime.model;

import java.math.BigDecimal;

/** Something a provider offers, e.g. "Haircut, 30 minutes, 5000 RWF". */
public record Service(
        int id,
        int providerId,
        String providerName,
        String name,
        int durationMinutes,
        BigDecimal price,
        boolean active) {
}
