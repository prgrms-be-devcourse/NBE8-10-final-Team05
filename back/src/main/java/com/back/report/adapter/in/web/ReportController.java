package com.back.report.adapter.in.web;

import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.report.adapter.in.web.docs.ReportApiDocs;
import com.back.report.adapter.in.web.dto.ReportCreateRequest;
import com.back.report.application.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class ReportController implements ReportApiDocs {

    private final ReportService reportService;

    @PostMapping
    public RsData<Long> create(
            @RequestBody @Valid ReportCreateRequest request,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ) {
        if (authMember == null) {
            throw new ServiceException("401-1", "Authentication is required.");
        }

        Long reportId = reportService.createReport(authMember.memberId(), request);

        return new RsData<>("201-1", "신고가 정상적으로 접수되었습니다.", reportId);
    }
}
