package com.back.report.adapter.out.persistence;

import com.back.report.domain.Report;
import com.back.report.domain.ReportStatus;
import com.back.report.domain.TargetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    boolean existsByReporterIdAndTargetIdAndTargetType(Long reporterId, Long targetId, TargetType targetType);
    List<Report> findAllByTargetTypeAndTargetIdAndStatus(TargetType targetType, Long targetId, ReportStatus status);
    long countByStatus(ReportStatus status);
    long countByCreateDateGreaterThanEqualAndCreateDateLessThan(
            LocalDateTime startInclusive, LocalDateTime endExclusive);
}
