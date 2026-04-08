package com.back.global.time;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

public final class KstDateRanges {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private KstDateRanges() {}

    public static DateTimeRange today(Clock clock) {
        LocalDate todayInKst = clock.instant().atZone(KST).toLocalDate();
        return new DateTimeRange(
                todayInKst.atStartOfDay(),
                todayInKst.plusDays(1).atStartOfDay()
        );
    }
}
