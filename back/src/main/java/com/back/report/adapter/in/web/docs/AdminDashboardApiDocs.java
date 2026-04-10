package com.back.report.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.report.adapter.in.web.dto.AdminDashboardStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(
    name = "관리자 대시보드",
    description =
        "운영자가 오늘 신고/편지/일기 현황과 처리 대기 건수를 한 번에 확인하는 통계 API입니다. 관리자 권한이 필요합니다.")
public interface AdminDashboardApiDocs {

  @Operation(
      summary = "대시보드 통계 조회",
      description =
          "오늘 생성된 신고 수, 대기/처리 완료 신고 수, 오늘 생성된 편지/일기 수, 현재 수신 가능한 사용자 수를 반환합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<AdminDashboardStatsResponse> getStats();
}
