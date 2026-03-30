package com.back.report.repository;

import com.back.report.entity.Report;
import com.back.report.entity.ReportStatus;
import com.back.report.entity.TargetType;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    boolean existsByReporterIdAndTargetIdAndTargetType(Long reporterId, Long targetId, TargetType targetType);
    List<Report> findAllByTargetTypeAndTargetIdAndStatus(TargetType targetType, Long targetId, ReportStatus status);
    long countByStatus(ReportStatus status);
    long countByCreateDateGreaterThanEqualAndCreateDateLessThan(
            LocalDateTime startInclusive, LocalDateTime endExclusive);
}
