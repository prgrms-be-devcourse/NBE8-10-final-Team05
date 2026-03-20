package com.back.global.security.adapter.in;

import com.back.global.security.jwt.JwtSubject;
import com.back.global.security.jwt.JwtTokenExtractor;
import com.back.global.security.jwt.JwtTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Authorization Bearer 토큰을 읽어 SecurityContext 인증 객체를 구성하는 필터. */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtTokenService jwtTokenService;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      JwtTokenExtractor.extractBearerToken(request.getHeader(HttpHeaders.AUTHORIZATION))
          .ifPresent(token -> tryAuthenticate(token, request));
    }

    filterChain.doFilter(request, response);
  }

  /** 토큰 검증이 실패하면 인증을 세팅하지 않고 통과시켜 최종적으로 401 응답이 나가게 한다. */
  private void tryAuthenticate(String token, HttpServletRequest request) {
    if (!jwtTokenService.validate(token)) {
      return;
    }

    try {
      JwtSubject subject = jwtTokenService.parseAccessToken(token);
      List<GrantedAuthority> authorities =
          subject.roles().stream()
              .map(SimpleGrantedAuthority::new)
              .map(GrantedAuthority.class::cast)
              .toList();
      AuthenticatedMember principal =
          new AuthenticatedMember(subject.memberId(), subject.email(), subject.roles());
      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(principal, token, authorities);
      authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
      SecurityContextHolder.getContext().setAuthentication(authentication);
    } catch (IllegalArgumentException exception) {
      SecurityContextHolder.clearContext();
    }
  }
}
