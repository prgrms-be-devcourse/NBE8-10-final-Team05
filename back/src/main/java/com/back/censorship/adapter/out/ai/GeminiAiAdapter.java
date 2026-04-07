package com.back.censorship.adapter.out.ai;

import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.censorship.application.port.out.AiAuditPort;
import com.back.global.exception.ServiceException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Gemini API를 사용하여 AI 검사를 수행하는 어댑터. */
@Component
@RequiredArgsConstructor
public class GeminiAiAdapter implements AiAuditPort {

    private final Client geminiClient;
    private final ObjectMapper objectMapper;

    @Override
    public AuditAiResponse audit(AuditAiRequest dto) {
        // 프롬프트
        //PROFANITY(욕설), PERSONAL_INFO(개인정보), INSINCERE(무성의), NONE
        String systemInstruction = """
            너는 익명 상담 서비스 '마음 온'의 인공지능 관리자야.
            입력된 데이터는 [제목]과 [내용]으로 구성되어 있어.
            입력된 %s의 제목과 내용을 검사하고, 동시에 내용을 1~2줄로 요약해줘.
            반드시 아래 JSON 형식으로만 응답해.
            형식: {"isPassed": boolean, "violationType": "PROFANITY"|"PERSONAL_INFO"|"INSINCERE"|"NONE", "message": "사용자 안내 문구"}
            
            [기준]
            1. PROFANITY (욕설 및 비방)
                - PASS: 일상적인 가벼운 농담이나 '자신'을 향한 낮은 수준('바보','멍청이' 등)의 한탄.
                - FAIL: 심한 욕설, 성적/패륜적 비하, 특정 집단 혐오, '바보', '멍청이' 등 '타인'을 비하하거나 조롱하는 모든 표현.
                - 변칙 욕설: 숫자/기호를 섞거나(병1신, 좆ㄴ나), 음운을 변형한(야발, 느억맘) 모든 우회 시도는 FAIL로 처리.
            2. PERSONAL_INFO (개인정보)
                - 전화번호, 상세 주소, 계좌번호 등 노출 시 FAIL.
            3. INSINCERE (무성의)
                - "ㅇㅇ", "ㅋㅋㅋ", 의미 없는 나열 등 공감이 결여된 답변은 FAIL.
            4. NONE
                - 위반 사항이 없을 때 적용.
            [주의 사항]
                - 안내 문구(message)는 서비스의 따뜻한 분위기에 맞춰 정중하게 작성해줘.
                - 위반 사항이 없으면 isPassed는 true, violationType은 NONE으로 응답해. 
                [요약 기준]
                - 받은 사람이 내용을 한눈에 파악할 수 있게 1~2줄 내외로 따뜻하게 요약해줘.       
            """.formatted(dto.type());

        try {
            // Gemini 호출
            GenerateContentResponse response = geminiClient.models.generateContent(
                    "gemini-3.1-flash-lite-preview",
                    systemInstruction + "\n내용: " + dto.content(),
                    null
            );

            // 결과 파싱 및 반환
            return objectMapper.readValue(response.text(), AuditAiResponse.class);

        } catch (Exception e) {

            throw new ServiceException("500-1",
                    "[AiService#auditContent] AI API communication failed: " + e.getMessage());
        }
    }
}