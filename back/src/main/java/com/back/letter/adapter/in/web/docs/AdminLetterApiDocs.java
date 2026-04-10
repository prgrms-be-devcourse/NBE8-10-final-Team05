package com.back.letter.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.letter.application.port.in.dto.AdminLetterDetailRes;
import com.back.letter.application.port.in.dto.AdminLetterHandleReq;
import com.back.letter.application.port.in.dto.AdminLetterListRes;
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
    name = "관리자 편지",
    description =
        "운영자가 편지 목록을 조회하고, 메모 기록/수신자 재배정/발신자 차단 같은 운영 조치를 수행하는 API입니다.")
public interface AdminLetterApiDocs {

  @Operation(
      summary = "편지 목록 조회",
      description = "상태와 검색어로 운영 대상 편지 목록을 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<AdminLetterListRes> getList(
      @Parameter(description = "편지 상태 필터") String status,
      @Parameter(description = "제목/내용/작성자 검색어") String query,
      @Parameter(description = "페이지 번호, 0부터 시작") int page,
      @Parameter(description = "페이지 크기") int size);

  @Operation(
      summary = "편지 상세 조회",
      description = "운영 대상 편지의 상세 내용과 조치 이력을 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요"),
    @ApiResponse(responseCode = "404", description = "편지 없음")
  })
  RsData<AdminLetterDetailRes> getDetail(@Parameter(description = "편지 ID") Long id);

  @Operation(
      summary = "편지 운영 조치",
      description =
          "운영자가 편지에 메모를 남기거나 수신자 재배정, 발신자 차단 조치를 수행합니다. "
              + "`action`은 `NOTE`, `REASSIGN_RECEIVER`, `BLOCK_SENDER` 중 하나를 사용합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조치 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<Void> handle(
      @Parameter(description = "조치 대상 편지 ID") Long id,
      @RequestBody(
              required = true,
              description = "운영 조치 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = AdminLetterHandleReq.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "action": "REASSIGN_RECEIVER",
                                    "memo": "수신자 부재로 재배정"
                                  }
                                  """)))
          AdminLetterHandleReq req,
      @Parameter(hidden = true) AuthenticatedMember authMember);
}
