package com.back.report.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.report.adapter.in.web.docs.AdminReportApiDocs;
import com.back.report.adapter.in.web.dto.ReportDetailResponse;
import com.back.report.adapter.in.web.dto.ReportHandleRequest;
import com.back.report.adapter.in.web.dto.ReportListResponse;
import com.back.report.application.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/reports")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController implements AdminReportApiDocs {

    private final ReportService reportService;

    // 신고 목록 조회
    @GetMapping
    public RsData<List<ReportListResponse>> getList() {
        List<ReportListResponse> reports = reportService.getReports();
        return new RsData<>("200-1", "신고 목록을 조회했습니다.", reports);
    }

    // 신고 상세 조회
    @GetMapping("/{id}")
    public RsData<ReportDetailResponse> getDetail(@PathVariable Long id) {
        ReportDetailResponse detail = reportService.getReportDetail(id);
        return new RsData<>("200-2", "신고 상세 정보를 조회했습니다.", detail);
    }

    // 신고 처리
    @PostMapping("/{id}/handle")
    public RsData<Void> handle(
            @PathVariable Long id,
            @RequestBody ReportHandleRequest request,
            @AuthenticationPrincipal AuthenticatedMember authMember) {
        reportService.handleReport(id, request, authMember.memberId());
        return new RsData<>("200-3", "신고 처리가 완료되었습니다.");
    }
}
