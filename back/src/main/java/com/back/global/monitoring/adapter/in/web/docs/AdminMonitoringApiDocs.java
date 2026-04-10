package com.back.global.monitoring.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;

@Tag(
    name = "관리자 모니터링",
    description =
        "Grafana/Prometheus 프록시 접근 전에 현재 사용자가 관리자 권한을 가진 세션인지 확인하는 API입니다. "
            + "Bearer 토큰이 아니라 refresh token 쿠키 기반으로 동작합니다.")
public interface AdminMonitoringApiDocs {

  @Operation(
      summary = "모니터링 접근 권한 확인",
      description =
          "refresh token 쿠키를 사용해 사용자를 복원한 뒤 관리자 권한 여부를 확인합니다. "
              + "모니터링 프록시 진입 직전의 서버측 권한 게이트 역할을 합니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "관리자 접근 확인 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 없음"),
    @ApiResponse(responseCode = "401", description = "유효한 세션 없음")
  })
  RsData<Void> authorizeMonitoringProxy(@Parameter(hidden = true) HttpServletRequest request);
}
