package com.back.notification.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.notification.adapter.in.web.dto.NotificationSubscriptionTicketResponse;
import com.back.notification.domain.Notification;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(
    name = "알림",
    description =
        "실시간 알림 티켓 발급, SSE 구독, 저장된 알림 목록 조회를 제공하는 API입니다. "
            + "브라우저는 보통 티켓 발급 후 SSE 구독 순서로 연결합니다.")
public interface NotificationApiDocs {

  @Operation(
      summary = "알림 구독 티켓 발급",
      description =
          "현재 로그인 사용자에 대한 단기 유효 구독 티켓을 발급합니다. "
              + "프론트는 받은 `ticket`을 `/api/v1/notifications/subscribe?ticket=...`에 사용해 SSE 연결을 엽니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "티켓 발급 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<NotificationSubscriptionTicketResponse> issueSubscribeTicket(
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "SSE 알림 구독",
      description =
          "발급받은 구독 티켓으로 실시간 알림 SSE 스트림을 엽니다. "
              + "이 API 자체는 티켓 기반이므로 Bearer 토큰 없이도 연결할 수 있습니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "SSE 연결 성공"),
    @ApiResponse(responseCode = "400", description = "유효하지 않거나 만료된 티켓")
  })
  SseEmitter subscribe(@Parameter(description = "구독 티켓") String ticket);

  @Operation(
      summary = "알림 목록 조회",
      description = "현재 로그인 사용자가 받은 알림 목록을 최신순으로 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<List<Notification>> getNotifications(
      @Parameter(hidden = true) AuthenticatedMember authMember);
}
