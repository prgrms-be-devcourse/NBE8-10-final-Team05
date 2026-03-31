package com.back.ai.application.port.out;

import com.back.ai.adapter.in.web.dto.AuditAiRequest;
import com.back.ai.adapter.in.web.dto.AuditAiResponse;

/** 외부 AI 검사를 수행하기 위한 출력 포트. */
public interface AiAuditPort {
    AuditAiResponse audit(AuditAiRequest request);
}