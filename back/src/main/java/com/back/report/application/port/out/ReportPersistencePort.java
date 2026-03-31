package com.back.report.application.port.out;

import com.back.report.domain.Report;
import com.back.report.domain.ReportStatus;
import com.back.report.domain.TargetType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReportPersistencePort {
    Report save(Report report);
    Optional<Report> findById(Long id);
    List<Report> findAll();
    boolean existsByReporterIdAndTargetIdAndTargetType(Long reporterId, Long targetId, TargetType targetType);
    List<Report> findAllByTargetTypeAndTargetIdAndStatus(TargetType targetType, Long targetId, ReportStatus status);
    long countByStatus(ReportStatus status);
    long countByCreateDateGreaterThanEqualAndCreateDateLessThan(
            LocalDateTime startInclusive,
            LocalDateTime endExclusive);
}
