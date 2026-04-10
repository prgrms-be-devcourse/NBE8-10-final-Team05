package com.back.consultation.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "실시간 상담 메시지 전송 요청")
public record ConsultationRequest(
    @NotBlank(message = "메시지를 입력해주세요.")
    @Schema(description = "전송할 상담 메시지", example = "지금 너무 불안한데 누군가와 이야기하고 싶어요.")
    String message
) {}
