package com.back.ai.service;

import com.back.ai.dto.AuditAiRequest;
import com.back.ai.dto.AuditAiResponse;
import com.back.global.exception.ServiceException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiService {

    private final Client geminiClient;
    private final ObjectMapper objectMapper;

    public AuditAiResponse auditContent(AuditAiRequest dto) {

        if (dto.content() == null || dto.content().isBlank()) {
            throw new ServiceException("400-1", "Content must not be blank.");
        }

        // 프롬프트
        //PROFANITY(욕설), PERSONAL_INFO(개인정보), INSINCERE(무성의), NONE
        String systemInstruction = """
            너는 익명 상담 서비스 '마음 온'의 인공지능 관리자야.
            입력된 %s의 내용을 검사해서 반드시 아래 JSON 형식으로만 응답해.
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
