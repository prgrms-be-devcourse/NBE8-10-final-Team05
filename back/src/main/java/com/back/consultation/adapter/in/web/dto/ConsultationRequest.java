package com.back.consultation.adapter.in.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ConsultationRequest(
    @NotBlank(message = "메시지를 입력해주세요.")
    String message
) {}