package com.back.member.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.member.adapter.in.web.dto.AdminMemberDetailResponse;
import com.back.member.adapter.in.web.dto.AdminMemberListResponse;
import com.back.member.adapter.in.web.dto.AdminRevokeMemberSessionsRequest;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberRoleRequest;
import com.back.member.adapter.in.web.dto.AdminUpdateMemberStatusRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
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
    name = "관리자 회원",
    description =
        "관리자가 회원 목록을 검색하고, 상태/권한/세션을 제어하는 운영 API입니다. 모든 엔드포인트는 관리자 권한이 필요합니다.")
public interface AdminMemberApiDocs {

  @Operation(
      summary = "회원 목록 조회",
      description =
          "검색어, 상태, 권한, 가입 제공자 기준으로 회원 목록을 조회합니다. "
              + "운영 콘솔의 회원 관리 화면을 구성할 때 사용하는 기본 조회 API입니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<AdminMemberListResponse> getMembers(
      @Parameter(description = "이메일/닉네임 기준 검색어") String query,
      @Parameter(description = "회원 상태 필터 값") String status,
      @Parameter(description = "회원 권한 필터 값") String role,
      @Parameter(description = "가입 provider 필터 값") String provider,
      @Parameter(description = "페이지 번호, 0부터 시작") int page,
      @Parameter(description = "페이지 크기") int size);

  @Operation(
      summary = "회원 상세 조회",
      description = "특정 회원의 상세 정보와 운영 이력을 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요"),
    @ApiResponse(responseCode = "404", description = "회원 없음")
  })
  RsData<AdminMemberDetailResponse> getMemberDetail(
      @Parameter(description = "조회할 회원 ID") Long memberId);

  @Operation(
      summary = "회원 프로필 수정",
      description = "관리자가 특정 회원의 닉네임 등 프로필 정보를 수정합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "수정 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<AdminMemberDetailResponse> updateMemberProfile(
      @Parameter(description = "수정할 회원 ID") Long memberId,
      @RequestBody(
              required = true,
              description = "프로필 수정 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = UpdateMemberProfileRequest.class),
                      examples = @ExampleObject(value = "{\"nickname\":\"운영자수정닉네임\"}")))
          UpdateMemberProfileRequest request);

  @Operation(
      summary = "회원 상태 변경",
      description =
          "회원 상태를 활성/정지 등으로 변경합니다. "
              + "필요 시 세션 강제 만료 옵션을 함께 전달해 즉시 접근을 차단할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "변경 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<AdminMemberDetailResponse> updateMemberStatus(
      @Parameter(description = "대상 회원 ID") Long memberId,
      @RequestBody(
              required = true,
              description = "상태 변경 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = AdminUpdateMemberStatusRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "status": "BLOCKED",
                                    "reason": "운영 정책 위반",
                                    "revokeSessions": true
                                  }
                                  """)))
          AdminUpdateMemberStatusRequest request,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "회원 권한 변경",
      description = "사용자 권한을 USER/ADMIN 등으로 변경합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "권한 변경 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<AdminMemberDetailResponse> updateMemberRole(
      @Parameter(description = "대상 회원 ID") Long memberId,
      @RequestBody(
              required = true,
              description = "권한 변경 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = AdminUpdateMemberRoleRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "role": "ADMIN",
                                    "reason": "운영 담당자 승격"
                                  }
                                  """)))
          AdminUpdateMemberRoleRequest request,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "회원 세션 강제 만료",
      description =
          "특정 회원의 refresh token 기반 세션을 만료시켜 재로그인을 강제합니다. "
              + "보안 사고 대응이나 계정 탈취 의심 시 즉시 세션을 끊는 용도입니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "세션 만료 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<AdminMemberDetailResponse> revokeMemberSessions(
      @Parameter(description = "대상 회원 ID") Long memberId,
      @RequestBody(
              required = false,
              description = "세션 만료 사유",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = AdminRevokeMemberSessionsRequest.class),
                      examples = @ExampleObject(value = "{\"reason\":\"이상 로그인 탐지\"}")))
          AdminRevokeMemberSessionsRequest request,
      @Parameter(hidden = true) AuthenticatedMember authMember);
}
