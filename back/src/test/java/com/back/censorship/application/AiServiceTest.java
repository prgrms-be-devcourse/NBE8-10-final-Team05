package com.back.censorship.application;

import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.censorship.application.port.out.AiAuditPort;
import com.back.censorship.application.service.AiService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
class AiServiceTest {

    @Mock
    private AiAuditPort aiAuditPort;

    @InjectMocks
    private AiService aiService;

    private void mockAiResponse(boolean isPassed, String violationType) {
        AuditAiResponse mockResponse = new AuditAiResponse(isPassed, violationType, "테스트 메시지");

        given(aiAuditPort.audit(any(AuditAiRequest.class)))
                .willReturn(mockResponse);
    }

    @Test
    @DisplayName("t1: 정상적인 편지 내용은 검열을 통과해야 한다")
    void t1() {
        AuditAiRequest request = new AuditAiRequest("오늘 하루도 수고 많으셨어요.", "LETTER");
        mockAiResponse(true, "NONE"); // 통과 시나리오

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isTrue();
        assertThat(response.violationType()).isEqualTo("NONE");
    }

    @Test
    @DisplayName("t2: 약한 수위의 타인 비방 목적이 아닌 표현")
    void t2() {
        AuditAiRequest request = new AuditAiRequest("나는 바보같아요..", "POST");
        mockAiResponse(true, "NONE"); // 통과 시나리오

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isTrue();
        assertThat(response.violationType()).isEqualTo("NONE");
    }

    @Test
    @DisplayName("t3: 약한 수위더라도 타인 비방 목적인 표현은 차단된다")
    void t3() {
        AuditAiRequest request = new AuditAiRequest("이 바보 같은 녀석아!", "POST");
        mockAiResponse(false, "PROFANITY"); // 차단 시나리오

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isFalse();
        assertThat(response.violationType()).isEqualTo("PROFANITY");
    }

    @Test
    @DisplayName("t4: 우회 욕설 시도")
    void t4() {
        AuditAiRequest request = new AuditAiRequest("시1발롬아", "POST");
        mockAiResponse(false, "PROFANITY"); // 차단 시나리오

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isFalse();
        assertThat(response.violationType()).isEqualTo("PROFANITY");
    }
}