package com.back.global.security.config;

import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtProperties;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsUtils;

/**
 * Spring Security 전역 설정.
 *
 * <p>현재 보안 정책:
 *
 * <ul>
 *   <li>세션을 사용하지 않는 Stateless API 보안
 *   <li>/api/v1/** 경로는 기본적으로 인증 필요
 *   <li>공개해야 하는 경로만 명시적으로 허용
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      SecurityAuthenticationEntryPoint authenticationEntryPoint,
      SecurityAccessDeniedHandler accessDeniedHandler)
      throws Exception {
    // API 중심 보안 체인 구성:
    // - 브라우저 폼 기반 기능 비활성화
    // - 커스텀 401/403 핸들러 사용
    // - 경로별 인가 규칙 정의
    http
        .csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        // JWT 기반 API는 서버 세션을 생성/사용하지 않는다.
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable)
        .exceptionHandling(
            handling ->
                handling
                    .authenticationEntryPoint(authenticationEntryPoint)
                    .accessDeniedHandler(accessDeniedHandler))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(CorsUtils::isPreFlightRequest)
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/health", "/error")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/v1/members", "/api/v1/auth/**")
                    .permitAll()
                    // 관리자 경로는 ADMIN 권한이 필요하다.
                    .requestMatchers("/api/v1/admin/**")
                    .hasRole("ADMIN")
                    // 나머지 /api/v1 경로는 모두 인증이 필요하다.
                    .requestMatchers("/api/v1/**")
                    .authenticated()
                    .anyRequest()
                    .permitAll())
        // 비인증 허용 엔드포인트를 위해 anonymous principal 유지.
        .anonymous(Customizer.withDefaults());

    return http.build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    // 로컬 개발용 CORS 정책.
    // 운영 도메인이 생기면 허용 Origin을 명시적으로 추가한다.
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
