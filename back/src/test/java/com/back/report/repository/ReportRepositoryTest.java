package com.back.report.repository;

import com.back.report.entity.Report;
import com.back.report.entity.ReportReason;
import com.back.report.entity.TargetType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;


import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ReportRepositoryTest {

    @Autowired
    private ReportRepository reportRepository;

    @Test
    @DisplayName("중복 신고 여부를 확인한다.")
    void existsBy_test() {
        Report report = Report.builder()
                .reporterId(1L)
                .targetId(10L)
                .targetType(TargetType.POST)
                .reason(ReportReason.SPAM)
                .build();
        reportRepository.save(report);

        boolean exists = reportRepository.existsByReporterIdAndTargetIdAndTargetType(1L, 10L, TargetType.POST);
        assertThat(exists).isTrue();
    }
}