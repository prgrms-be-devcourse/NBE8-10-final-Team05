package com.back.consultation.adapter.in.web.docs;

import com.back.consultation.adapter.in.web.dto.ConsultationRequest;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(
    name = "상담",
    description =
        "실시간 상담/대화 기능을 위한 SSE 연결과 메시지 전송 API입니다. 현재 로그인한 사용자 단위로 상담 세션이 유지됩니다.")
public interface ConsultationApiDocs {

  @Operation(
      summary = "상담 SSE 연결",
      description =
          "실시간 상담 응답을 수신하기 위한 SSE 스트림을 엽니다. "
              + "클라이언트는 먼저 이 연결을 연 뒤 `chat` API로 메시지를 전송하는 방식으로 사용하는 것이 일반적입니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "SSE 연결 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  SseEmitter subscribe(@Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "상담 메시지 전송",
      description =
          "현재 상담 세션에 사용자 메시지를 전송합니다. "
              + "실제 응답은 SSE 채널을 통해 비동기로 전달됩니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "전송 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<Void> chat(
      @Parameter(hidden = true) AuthenticatedMember authMember,
      @RequestBody(
              required = true,
              description = "상담 메시지 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = ConsultationRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "message": "요즘 불안이 심한데 어떻게 마음을 정리하면 좋을까요?"
                                  }
                                  """)))
          ConsultationRequest request);
}
