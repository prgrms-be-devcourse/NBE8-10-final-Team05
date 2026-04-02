package com.back.censorship.application.service;

import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.censorship.application.port.out.AiAuditPort;
import com.back.global.exception.ServiceException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiService {

    private final AiAuditPort aiAuditPort;

    public AuditAiResponse auditContent(AuditAiRequest dto) {

        if (dto.content() == null || dto.content().isBlank()) {
            throw new ServiceException("400-1", "Content must not be blank.");
        }
        return  aiAuditPort.audit(dto);
    }
}
