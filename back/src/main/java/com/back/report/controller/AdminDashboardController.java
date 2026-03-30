package com.back.report.controller;

import com.back.global.rsData.RsData;
import com.back.report.dto.AdminDashboardStatsResponse;
import com.back.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    private final ReportService reportService;

    @GetMapping("/stats")
    public RsData<AdminDashboardStatsResponse> getStats() {
        return new RsData<>(
                "200-1",
                "관리자 대시보드 통계를 조회했습니다.",
                reportService.getDashboardStats());
    }
}
