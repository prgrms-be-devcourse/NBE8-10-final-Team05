package com.back.report.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.report.adapter.in.web.dto.ReportDetailResponse;
import com.back.report.adapter.in.web.dto.ReportHandleRequest;
import com.back.report.adapter.in.web.dto.ReportListResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@Tag(
    name = "관리자 신고",
    description =
        "운영자가 신고 목록을 조회하고 상세를 확인한 뒤 삭제, 반려, 계정 정지 등 조치를 수행하는 API입니다.")
public interface AdminReportApiDocs {

  @Operation(
      summary = "신고 목록 조회",
      description = "현재 접수된 신고 목록을 조회합니다. 운영 대기열 화면의 기본 데이터 소스입니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<List<ReportListResponse>> getList();

  @Operation(
      summary = "신고 상세 조회",
      description =
          "단일 신고 건의 상세 사유, 원본 대상 정보, 처리 상태와 이력을 조회합니다. "
              + "실제 조치 전에 검토 화면에서 사용합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요"),
    @ApiResponse(responseCode = "404", description = "신고 없음")
  })
  RsData<ReportDetailResponse> getDetail(@Parameter(description = "신고 ID") Long id);

  @Operation(
      summary = "신고 처리",
      description =
          "신고 처리 액션을 기록하고 대상 콘텐츠 또는 사용자에 후속 조치를 수행합니다. "
              + "`action`은 `REJECT`, `DELETE`, `BLOCK_USER` 중 하나를 사용합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "처리 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요"),
    @ApiResponse(responseCode = "404", description = "신고 없음")
  })
  RsData<Void> handle(
      @Parameter(description = "처리할 신고 ID") Long id,
      @RequestBody(
              required = true,
              description = "신고 처리 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = ReportHandleRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "action": "DELETE",
                                    "adminComment": "운영 정책 위반 확인",
                                    "isNotify": true,
                                    "notificationMessage": "운영 정책 위반으로 게시글이 삭제되었습니다."
                                  }
                                  """)))
          ReportHandleRequest request,
      @Parameter(hidden = true) AuthenticatedMember authMember);
}
