package com.back.member.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.adapter.in.web.dto.MemberResponse;
import com.back.member.adapter.in.web.dto.UpdateMemberEmailRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberPasswordRequest;
import com.back.member.adapter.in.web.dto.UpdateMemberProfileRequest;
import com.back.member.adapter.in.web.dto.WithdrawMemberRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;

@Tag(
    name = "회원",
    description =
        "회원 기본 계정 생성, 내 정보 조회, 프로필/이메일/비밀번호 변경, 랜덤 편지 수신 설정을 제공하는 API입니다.")
public interface MemberApiDocs {

  @Operation(
      summary = "회원 생성",
      description =
          "일반 회원 계정을 생성합니다. 현재 서비스에는 `/api/v1/auth/signup`도 존재하므로, "
              + "프론트 공개 가입 플로우는 보통 인증 API를 우선 사용하고 이 엔드포인트는 내부/대체 가입 흐름에서 활용할 수 있습니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "회원 생성 성공"),
    @ApiResponse(responseCode = "400", description = "입력값 검증 실패")
  })
  RsData<MemberResponse> createMember(
      @RequestBody(
              required = true,
              description = "회원 생성 요청 본문",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = CreateMemberRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "email": "member@example.com",
                                    "password": "member1234!",
                                    "nickname": "따뜻한고래"
                                  }
                                  """)))
          CreateMemberRequest request);

  @Operation(
      summary = "내 회원 정보 조회",
      description = "현재 access token 기준으로 본인 회원 정보를 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<MemberResponse> getMyMember(@Parameter(hidden = true) Authentication authentication);

  @Operation(
      summary = "회원 단건 조회",
      description = "관리자 전용 레거시 조회 API입니다. 일반 사용자는 사용할 수 없습니다.",
      deprecated = true)
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요"),
    @ApiResponse(responseCode = "404", description = "회원 없음")
  })
  RsData<MemberResponse> getMember(@Parameter(description = "회원 ID") Long memberId);

  @Operation(
      summary = "내 닉네임 수정",
      description =
          "현재 로그인한 사용자의 프로필 닉네임을 수정합니다. "
              + "변경 즉시 이후 편지/게시글/일기 표시 이름에도 반영됩니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "수정 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<MemberResponse> updateMyProfile(
      @Parameter(hidden = true) Authentication authentication,
      @RequestBody(
              required = true,
              description = "닉네임 변경 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = UpdateMemberProfileRequest.class),
                      examples = @ExampleObject(value = "{\"nickname\":\"조용한숲\"}")))
          UpdateMemberProfileRequest request);

  @Operation(
      summary = "내 이메일 변경",
      description = "현재 로그인한 사용자의 이메일 주소를 변경합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "변경 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<MemberResponse> updateMyEmail(
      @Parameter(hidden = true) Authentication authentication,
      @RequestBody(
              required = true,
              description = "이메일 변경 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = UpdateMemberEmailRequest.class),
                      examples = @ExampleObject(value = "{\"email\":\"new-email@example.com\"}")))
          UpdateMemberEmailRequest request);

  @Operation(
      summary = "내 비밀번호 변경",
      description = "현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "변경 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "400", description = "현재 비밀번호 불일치 또는 새 비밀번호 정책 위반")
  })
  RsData<MemberResponse> updateMyPassword(
      @Parameter(hidden = true) Authentication authentication,
      @RequestBody(
              required = true,
              description = "비밀번호 변경 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = UpdateMemberPasswordRequest.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "currentPassword": "oldPassword123!",
                                    "newPassword": "newPassword123!"
                                  }
                                  """)))
          UpdateMemberPasswordRequest request);

  @Operation(
      summary = "회원 탈퇴",
      description =
          "현재 로그인한 계정을 탈퇴 처리합니다. "
              + "비밀번호 확인이 필요한 계정 유형에서는 `currentPassword`를 함께 전달해야 합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "탈퇴 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<Void> withdrawMyMember(
      @Parameter(hidden = true) Authentication authentication,
      @RequestBody(
              required = false,
              description = "필요 시 현재 비밀번호를 포함한 탈퇴 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = WithdrawMemberRequest.class),
                      examples = @ExampleObject(value = "{\"currentPassword\":\"demo1234!\"}")))
          WithdrawMemberRequest request);

  @Operation(
      summary = "관리자 회원 프로필 수정",
      description = "관리자가 특정 회원의 프로필을 대신 수정합니다.",
      deprecated = true)
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "수정 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<MemberResponse> updateProfile(
      @Parameter(description = "회원 ID") Long memberId,
      @RequestBody(
              required = true,
              description = "프로필 수정 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = UpdateMemberProfileRequest.class),
                      examples = @ExampleObject(value = "{\"nickname\":\"운영수정닉네임\"}")))
          UpdateMemberProfileRequest request);

  @Operation(
      summary = "랜덤 편지 수신 설정 토글",
      description =
          "사용자가 랜덤 편지 수신 허용 여부를 토글합니다. "
              + "랜덤 편지 매칭 대상에서 포함/제외시키는 설정으로 사용됩니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "토글 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<MemberResponse> toggleMyRandomSetting(
      @Parameter(hidden = true) Authentication authentication);
}
