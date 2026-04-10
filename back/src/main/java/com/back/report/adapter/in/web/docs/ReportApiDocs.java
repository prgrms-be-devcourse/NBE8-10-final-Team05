package com.back.report.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.report.adapter.in.web.dto.ReportCreateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(
    name = "신고",
    description =
        "게시글, 편지, 댓글을 신고하는 사용자용 API입니다. 중복 신고 방지와 운영 처리 흐름의 시작점 역할을 합니다.")
public interface ReportApiDocs {

  @Operation(
      summary = "신고 접수",
      description =
          "특정 게시글, 편지, 댓글에 대해 신고를 접수합니다. "
              + "`targetType`은 `POST`, `LETTER`, `COMMENT` 중 하나를 사용하고, `reason`은 `PROFANITY`, `SPAM`, `INAPPROPRIATE`, `PERSONAL_INFO`, `OTHER` 중 하나를 사용합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "신고 접수 성공"),
    @ApiResponse(responseCode = "400", description = "중복 신고 또는 잘못된 요청"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<Long> create(
      @RequestBody(
              required = true,
              description = "신고 생성 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = ReportCreateRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "targetId": 10,
                                    "targetType": "POST",
                                    "reason": "PROFANITY",
                                    "content": "욕설이 포함되어 있습니다."
                                  }
                                  """)))
          ReportCreateRequest request,
      @Parameter(hidden = true) AuthenticatedMember authMember);
}
