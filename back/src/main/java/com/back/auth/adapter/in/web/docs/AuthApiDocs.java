package com.back.auth.adapter.in.web.docs;

import com.back.auth.adapter.in.web.dto.AuthLoginRequest;
import com.back.auth.adapter.in.web.dto.AuthMemberResponse;
import com.back.auth.adapter.in.web.dto.AuthSignupRequest;
import com.back.auth.adapter.in.web.dto.AuthTokenResponse;
import com.back.global.rsData.RsData;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

@Tag(
    name = "인증",
    description =
        "이메일 로그인, 토큰 재발급, 현재 세션 확인, OIDC 로그인 진입점을 제공하는 API입니다. "
            + "로그인 성공 시 access token은 응답 본문으로, refresh token은 HttpOnly 쿠키로 발급됩니다.")
public interface AuthApiDocs {

  @Operation(
      summary = "회원가입",
      description =
          "이메일, 비밀번호, 닉네임으로 일반 계정을 생성합니다. "
              + "가입 직후 자동 로그인되지는 않으므로, 이후 `/api/v1/auth/login`을 호출해 토큰을 발급받아야 합니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "회원가입 성공"),
    @ApiResponse(responseCode = "400", description = "입력값 검증 실패 또는 중복 계정")
  })
  RsData<AuthMemberResponse> signup(
      @RequestBody(
              required = true,
              description = "회원가입 요청 본문",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = AuthSignupRequest.class),
                      examples =
                          @ExampleObject(
                              name = "일반 회원가입",
                              value =
                                  """
                                  {
                                    "email": "demo@example.com",
                                    "password": "demo1234!",
                                    "nickname": "마음온데모"
                                  }
                                  """)))
          AuthSignupRequest request);

  @Operation(
      summary = "로그인",
      description =
          "이메일/비밀번호를 검증한 뒤 access token과 회원 요약 정보를 응답하고, "
              + "refresh token은 HttpOnly 쿠키로 설정합니다. Swagger에서 받은 access token은 우측 상단 Authorize에 넣어 보호 API를 시연할 수 있습니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "로그인 성공"),
    @ApiResponse(responseCode = "400", description = "잘못된 요청"),
    @ApiResponse(responseCode = "401", description = "이메일 또는 비밀번호 불일치")
  })
  RsData<AuthTokenResponse> login(
      @RequestBody(
              required = true,
              description = "로그인 요청 본문",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = AuthLoginRequest.class),
                      examples =
                          @ExampleObject(
                              name = "로그인",
                              value =
                                  """
                                  {
                                    "email": "demo@example.com",
                                    "password": "demo1234!"
                                  }
                                  """)))
          AuthLoginRequest request,
      @Parameter(hidden = true) HttpServletResponse response);

  @Operation(
      summary = "Access 토큰 재발급",
      description =
          "refresh token 쿠키를 사용해 access token과 refresh token을 함께 재발급합니다. "
              + "클라이언트는 refresh token을 직접 다루지 않고 쿠키만 유지하면 됩니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "재발급 성공"),
    @ApiResponse(responseCode = "401", description = "refresh token 누락 또는 만료")
  })
  RsData<AuthTokenResponse> refresh(
      @Parameter(hidden = true) HttpServletRequest request,
      @Parameter(hidden = true) HttpServletResponse response);

  @Operation(
      summary = "현재 세션 확인",
      description =
          "refresh token 쿠키의 유효성만 확인해 현재 세션을 복원합니다. "
              + "토큰 회전 없이 access token payload만 다시 구성하므로 앱 진입 시 세션 복구 용도로 적합합니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "세션 확인 성공"),
    @ApiResponse(responseCode = "401", description = "유효한 refresh token 없음")
  })
  RsData<AuthTokenResponse> session(@Parameter(hidden = true) HttpServletRequest request);

  @Operation(
      summary = "로그아웃",
      description =
          "refresh token을 폐기하고 관련 쿠키를 만료시킵니다. "
              + "클라이언트는 응답 이후 로컬 access token도 함께 제거해야 안전하게 로그아웃 상태를 유지할 수 있습니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "로그아웃 성공")
  })
  RsData<Void> logout(
      @Parameter(hidden = true) HttpServletRequest request,
      @Parameter(hidden = true) HttpServletResponse response);

  @Operation(
      summary = "현재 로그인 사용자 조회",
      description =
          "Bearer access token 기준으로 현재 인증된 사용자의 프로필 요약 정보를 조회합니다. "
              + "로그인 직후 토큰이 정상 발급되었는지 확인하거나 프론트 초기화 시 현재 사용자 정보를 복원할 때 사용합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<AuthMemberResponse> me(@Parameter(hidden = true) Authentication authentication);

  @Operation(
      summary = "OIDC 로그인 시작",
      description =
          "provider별 인가 URL을 생성하고 해당 주소로 리다이렉트합니다. "
              + "`redirect_uri`는 로그인 완료 후 프론트가 다시 돌아갈 주소이며, 서버 allowlist에 등록된 값만 허용됩니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "302", description = "외부 OIDC 인가 페이지로 리다이렉트"),
    @ApiResponse(responseCode = "400", description = "허용되지 않은 redirect_uri 또는 provider")
  })
  ResponseEntity<Void> startOidcAuthorize(
      @Parameter(description = "OIDC provider 식별자. 예: `maum-on-oidc`, `kakao`") String provider,
      @Parameter(description = "로그인 완료 후 프론트가 복귀할 주소") String redirectUri,
      @Parameter(hidden = true) HttpServletRequest request);

  @Operation(
      summary = "OIDC 콜백 처리",
      description =
          "외부 OIDC 제공자가 전달한 code/state를 검증하고 내부 JWT를 발급한 뒤 프론트 리다이렉트 주소로 이동시킵니다. "
              + "일반 사용자는 Swagger에서 직접 호출하기보다 브라우저 로그인 흐름에서 사용하게 됩니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "302", description = "프론트 리다이렉트"),
    @ApiResponse(responseCode = "400", description = "code/state 검증 실패")
  })
  ResponseEntity<Void> handleOidcCallback(
      @Parameter(description = "OIDC provider 식별자") String provider,
      @Parameter(description = "인가 코드") String code,
      @Parameter(description = "인가 요청 시 발급된 state 값") String state,
      @Parameter(hidden = true) HttpServletRequest request,
      @Parameter(hidden = true) HttpServletResponse response);
}
