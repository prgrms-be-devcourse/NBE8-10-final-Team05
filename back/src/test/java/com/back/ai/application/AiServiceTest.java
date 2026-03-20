package com.back.ai.application;

import com.back.ai.dto.AuditAiRequest;
import com.back.ai.dto.AuditAiResponse;
import com.back.ai.service.AiService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class AiServiceTest {

    @Autowired
    private AiService aiService;

    @Test
    @DisplayName("정상적인 편지 내용은 검열을 통과해야 한다")
    void t1() {
        AuditAiRequest request = new AuditAiRequest("오늘 하루도 정말 수고 많으셨어요. 당신을 응원합니다.", "LETTER");

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isTrue();
        assertThat(response.violationType()).isEqualTo("NONE");
    }

    @Test
    @DisplayName("약한 수위의 타인 비방 목적이 아닌 표현")
    void t2() {
        AuditAiRequest request = new AuditAiRequest("나는 바보같아요..", "POST");

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isTrue();
        assertThat(response.violationType()).isEqualTo("NONE");
    }

    @Test
    @DisplayName("약한 수위더라도 타인 비방 목적인 표현")
    void t3() {
        AuditAiRequest request = new AuditAiRequest("이 바보 같은 녀석아!", "POST");

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isFalse();
        assertThat(response.violationType()).isEqualTo("PROFANITY");
    }

    @Test
    @DisplayName("우회 욕설 시도")
    void t4() {
        AuditAiRequest request = new AuditAiRequest("시1발롬아", "POST");

        AuditAiResponse response = aiService.auditContent(request);

        assertThat(response.isPassed()).isFalse();
        assertThat(response.violationType()).isEqualTo("PROFANITY");
    }
}