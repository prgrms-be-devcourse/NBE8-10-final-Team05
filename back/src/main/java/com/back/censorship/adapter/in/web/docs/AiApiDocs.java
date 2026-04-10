package com.back.censorship.adapter.in.web.docs;

import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.global.rsData.RsData;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(
    name = "AI 점검",
    description =
        "작성 콘텐츠의 욕설, 개인정보 노출, 무성의 표현 등을 AI로 점검하는 API입니다. 편지/게시글 작성 전후의 안전장치로 사용할 수 있습니다.")
public interface AiApiDocs {

  @Operation(
      summary = "콘텐츠 AI 점검",
      description =
          "입력한 콘텐츠를 AI로 분석해 통과 여부, 위반 유형, 안내 메시지, 요약을 반환합니다. "
              + "`type`에는 `Letter`, `Post` 같은 도메인 힌트를 전달할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "점검 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<AuditAiResponse> audit(
      @RequestBody(
              required = true,
              description = "AI 점검 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = AuditAiRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "content": "전화번호는 010-1234-5678이고 너무 화가 나.",
                                    "type": "Letter"
                                  }
                                  """)))
          AuditAiRequest request);
}
