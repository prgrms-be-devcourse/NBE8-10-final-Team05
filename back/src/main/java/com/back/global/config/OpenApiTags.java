package com.back.global.config;

import io.swagger.v3.oas.models.tags.Tag;
import java.util.Arrays;
import java.util.List;

public enum OpenApiTags {
  HOME("홈", "홈 / 공개 통계", "서비스 메인 화면에서 사용하는 공개 통계 API입니다."),
  AUTH("인증", "인증 / 세션", "로그인, 세션 복구, 토큰 재발급, OIDC 진입점을 제공하는 인증 API입니다."),
  MEMBER("회원", "회원 / 프로필", "일반 사용자의 계정 정보 조회와 프로필 관리 API입니다."),
  POST("게시글", "게시글", "고민, 일상, 질문 카테고리의 게시글 API입니다."),
  COMMENT("댓글", "댓글", "게시글 댓글과 대댓글 관리 API입니다."),
  REPORT("신고", "신고", "사용자가 게시글, 댓글, 편지를 신고하는 API입니다."),
  LETTER("편지", "마음 편지", "익명/랜덤 편지 송수신과 답장 흐름을 담당하는 핵심 API입니다."),
  DIARY("일기", "감정 일기", "감정 기록용 일기 작성, 수정, 조회 API입니다."),
  CONSULTATION("상담", "실시간 상담", "SSE 기반 실시간 상담 연결과 메시지 전송 API입니다."),
  AI_AUDIT("AI 점검", "콘텐츠 안전 점검", "AI 기반 유해성/개인정보/무성의 표현 점검 API입니다."),
  NOTIFICATION("알림", "실시간 알림", "알림 티켓 발급, SSE 구독, 알림 목록 조회 API입니다."),
  IMAGE("이미지", "이미지 업로드", "에디터 및 일기에서 사용하는 이미지 업로드/삭제 API입니다."),
  ADMIN_DASHBOARD("관리자 대시보드", "운영 대시보드", "운영자가 확인하는 대시보드 통계 API입니다."),
  ADMIN_MEMBER("관리자 회원", "운영 회원 관리", "운영자의 회원 검색, 상태/권한/세션 제어 API입니다."),
  ADMIN_REPORT("관리자 신고", "운영 신고 관리", "운영자의 신고 검토 및 처리 API입니다."),
  ADMIN_LETTER("관리자 편지", "운영 편지 관리", "운영자의 편지 검토 및 조치 API입니다."),
  ADMIN_MONITORING("관리자 모니터링", "운영 모니터링", "모니터링 프록시 접근 권한 확인 API입니다."),
  LOADTEST("부하테스트", "부하테스트 시드", "k6 부하 테스트용 데이터 재시딩 API입니다.");

  private final String sourceName;
  private final String displayName;
  private final String description;

  OpenApiTags(String sourceName, String displayName, String description) {
    this.sourceName = sourceName;
    this.displayName = displayName;
    this.description = description;
  }

  public String sourceName() {
    return sourceName;
  }

  public String displayName() {
    return displayName;
  }

  public Tag toModelTag() {
    return new Tag().name(displayName).description(description);
  }

  public static String remap(String sourceName) {
    return Arrays.stream(values())
        .filter(tag -> tag.sourceName.equals(sourceName))
        .findFirst()
        .map(OpenApiTags::displayName)
        .orElse(sourceName);
  }

  public static List<Tag> orderedModelTags() {
    return Arrays.stream(values()).map(OpenApiTags::toModelTag).toList();
  }
}
