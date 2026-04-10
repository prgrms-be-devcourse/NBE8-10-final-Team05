package com.back.report.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "운영자 신고 처리 요청")
public record ReportHandleRequest(
        @Schema(description = "운영 처리 액션", example = "DELETE") String action,
        @Schema(description = "운영자 내부 메모", example = "운영 정책 위반으로 게시글을 삭제했습니다.") String adminComment,
        @Schema(description = "신고자 또는 대상자에게 알림을 발송할지 여부", example = "true") Boolean isNotify,
        @Schema(description = "알림 메시지", example = "운영 정책 위반으로 게시글이 숨김 처리되었습니다.") String notificationMessage
) {}
