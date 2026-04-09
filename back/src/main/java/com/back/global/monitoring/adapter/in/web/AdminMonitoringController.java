package com.back.global.monitoring.adapter.in.web;

import com.back.auth.application.AuthService;
import com.back.auth.application.RefreshTokenCookieService;
import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/monitoring")
@RequiredArgsConstructor
public class AdminMonitoringController {

  private static final String FORBIDDEN_MESSAGE = "You do not have permission.";
  private final AuthService authService;
  private final RefreshTokenCookieService refreshTokenCookieService;

  @GetMapping("/auth")
  public RsData<Void> authorizeMonitoringProxy(HttpServletRequest request) {
    String rawRefreshToken = refreshTokenCookieService.resolveRefreshToken(request).orElse(null);
    Member member = authService.authenticateByRefreshToken(rawRefreshToken);
    if (member.getRole() != MemberRole.ADMIN) {
      throw new ServiceException("403-1", FORBIDDEN_MESSAGE);
    }
    return new RsData<>("200-1", "관리자 모니터링 프록시 접근을 확인했습니다.");
  }
}
