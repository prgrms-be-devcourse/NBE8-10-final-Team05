package com.back.global.time;

import java.time.LocalDateTime;

public record DateTimeRange(
        LocalDateTime startInclusive,
        LocalDateTime endExclusive
) {}
