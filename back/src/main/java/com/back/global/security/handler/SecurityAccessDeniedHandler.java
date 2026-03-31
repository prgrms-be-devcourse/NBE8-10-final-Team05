package com.back.global.security.handler;

import com.back.global.rsData.RsData;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/** 인증은 되었지만 권한이 없는 사용자가 접근했을 때(403) JSON 응답을 내려주는 핸들러. */
@Component
public class SecurityAccessDeniedHandler implements AccessDeniedHandler {

  private final ObjectMapper objectMapper;

  public SecurityAccessDeniedHandler(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  // 인가 실패 상황에서 표준 에러 포맷(RsData)으로 403 응답을 반환한다.
  @Override
  public void handle(
      HttpServletRequest request,
      HttpServletResponse response,
      AccessDeniedException accessDeniedException)
      throws IOException {
    RsData<Void> rsData = new RsData<>("403-1", "You do not have permission.");
    response.setStatus(rsData.statusCode());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    objectMapper.writeValue(response.getWriter(), rsData);
  }
}
