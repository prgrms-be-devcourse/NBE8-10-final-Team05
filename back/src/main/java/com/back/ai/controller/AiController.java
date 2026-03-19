package com.back.ai.controller;

import com.back.ai.dto.AuditAiRequest;
import com.back.ai.dto.AuditAiResponse;
import com.back.ai.service.AiService;
import com.back.global.rsData.RsData;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;

    @PostMapping("/audit")
    public RsData<AuditAiResponse> audit(@RequestBody AuditAiRequest request) {
        AuditAiResponse response = aiService.auditContent(request);

        return new RsData<>("200-1", "AI audit completed.", response);
    }
}
