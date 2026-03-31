package com.back.report.adapter.out.persistence;

import com.back.report.application.port.out.ReportPersistencePort;
import com.back.report.domain.Report;
import com.back.report.domain.ReportStatus;
import com.back.report.domain.TargetType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

// ... 생략
@Component
@RequiredArgsConstructor
public class ReportPersistenceAdapter implements ReportPersistencePort {
    private final ReportRepository reportRepository;

    @Override
    public Report save(Report report) {
        return reportRepository.save(report);
    }

    @Override
    public Optional<Report> findById(Long id) {
        return reportRepository.findById(id);
    }

    @Override
    public List<Report> findAll() {
        return reportRepository.findAll();
    }

    @Override
    public boolean existsByReporterIdAndTargetIdAndTargetType(Long reporterId, Long targetId, TargetType targetType) {
        return reportRepository.existsByReporterIdAndTargetIdAndTargetType(reporterId, targetId, targetType);
    }

    @Override
    public List<Report> findAllByTargetTypeAndTargetIdAndStatus(TargetType targetType, Long targetId, ReportStatus status) {
        return reportRepository.findAllByTargetTypeAndTargetIdAndStatus(targetType, targetId, status);
    }

    @Override
    public long countByStatus(ReportStatus status) {
        return reportRepository.countByStatus(status);
    }

    @Override
    public long countByCreateDateGreaterThanEqualAndCreateDateLessThan(
            LocalDateTime startInclusive,
            LocalDateTime endExclusive) {
        return reportRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(
                startInclusive,
                endExclusive
        );
    }

}
