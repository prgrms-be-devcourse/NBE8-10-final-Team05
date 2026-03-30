package com.back.global.security.adapter.in;

import com.back.global.security.jwt.JwtSubject;
import com.back.global.security.jwt.JwtTokenExtractor;
import com.back.global.security.jwt.JwtTokenService;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
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
  private final MemberRepository memberRepository;

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
      memberRepository
          .findById(subject.memberId())
          .filter(this::isCurrentlyAuthenticatable)
          .ifPresentOrElse(
              member -> authenticate(member, token, request),
              SecurityContextHolder::clearContext);
    } catch (IllegalArgumentException exception) {
      SecurityContextHolder.clearContext();
    }
  }

  /** 현재 DB 기준으로 로그인 가능한 회원만 인증한다. */
  private boolean isCurrentlyAuthenticatable(Member member) {
    return member.getStatus() == MemberStatus.ACTIVE;
  }

  /** 권한은 토큰 클레임이 아니라 현재 DB role 기준으로 다시 구성한다. */
  private void authenticate(Member member, String token, HttpServletRequest request) {
    List<String> roles = List.of("ROLE_" + member.getRole().name());
    List<GrantedAuthority> authorities =
        roles.stream().map(SimpleGrantedAuthority::new).map(GrantedAuthority.class::cast).toList();
    AuthenticatedMember principal = new AuthenticatedMember(member.getId(), member.getEmail(), roles);
    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(principal, token, authorities);
    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
    SecurityContextHolder.getContext().setAuthentication(authentication);
  }
}
