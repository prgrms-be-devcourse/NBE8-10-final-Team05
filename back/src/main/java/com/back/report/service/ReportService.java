package com.back.report.service;

import com.back.global.exception.ServiceException;
import com.back.report.dto.ReportCreateRequest;
import com.back.report.entity.Report;
import com.back.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;

    @Transactional
    public Long createReport(Long reporterId, ReportCreateRequest request) {
        // 중복 신고 방지
        if (reportRepository.existsByReporterIdAndTargetIdAndTargetType(
                reporterId, request.targetId(), request.targetType())) {
            throw new ServiceException("400-1", "이미 신고한 콘텐츠입니다.");
        }

        Report report = Report.create(
                reporterId,
                request.targetId(),
                request.targetType(),
                request.reason(),
                request.content()
        );

        return reportRepository.save(report).getId(); // BaseEntity의 id 반환
    }
}