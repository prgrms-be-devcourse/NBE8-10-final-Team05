package com.back.global.security.config;

import com.back.auth.application.OidcAuthorizeProperties;
import com.back.global.security.adapter.in.JwtAuthenticationFilter;
import com.back.global.security.handler.OAuth2LoginSuccessHandler;
import com.back.global.security.handler.SecurityAccessDeniedHandler;
import com.back.global.security.handler.SecurityAuthenticationEntryPoint;
import com.back.global.security.jwt.JwtProperties;
import jakarta.servlet.DispatcherType;
import java.time.Clock;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
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
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.CorsUtils;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Spring Security 전역 설정.
 *
 * <p>현재 보안 정책:
 *
 * <ul>
 *   <li>JWT API + OIDC 로그인 공존
 *   <li>공개 경로만 명시적으로 허용
 *   <li>나머지 모든 경로는 기본 거부(deny by default)
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties({JwtProperties.class, OidcAuthorizeProperties.class})
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      ObjectProvider<JwtAuthenticationFilter> jwtAuthenticationFilterProvider,
      SecurityAuthenticationEntryPoint authenticationEntryPoint,
      SecurityAccessDeniedHandler accessDeniedHandler,
      ObjectProvider<OAuth2LoginSuccessHandler> oauth2LoginSuccessHandlerProvider)
      throws Exception {
    JwtAuthenticationFilter jwtAuthenticationFilter =
        jwtAuthenticationFilterProvider.getIfAvailable();
    OAuth2LoginSuccessHandler oauth2LoginSuccessHandler =
        oauth2LoginSuccessHandlerProvider.getIfAvailable();

    // API + OIDC 로그인 보안 체인 구성:
    // - 브라우저 폼 기반 기능 비활성화
    // - 커스텀 401/403 핸들러 사용
    // - 경로별 인가 규칙 정의
    http.csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        // oauth2 authorization_code 핸드셰이크에는 임시 세션 저장소가 필요하다.
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable)
        .exceptionHandling(
            handling ->
                handling
                    .authenticationEntryPoint(authenticationEntryPoint)
                    .accessDeniedHandler(accessDeniedHandler));

    if (oauth2LoginSuccessHandler != null) {
      http.oauth2Login(oauth2 -> oauth2.successHandler(oauth2LoginSuccessHandler));
    } else {
      http.oauth2Login(Customizer.withDefaults());
    }

    if (jwtAuthenticationFilter != null) {
      http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
    }

    http.authorizeHttpRequests(
            auth ->
                auth.dispatcherTypeMatchers(DispatcherType.ERROR)
                    .permitAll()
                    .requestMatchers(CorsUtils::isPreFlightRequest)
                    .permitAll()
                    .requestMatchers("/error")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.GET,
                        "/api/v1/health",
                        "/api/v1/auth/oidc/authorize/**",
                        "/api/v1/auth/oidc/callback/**")
                    .permitAll()
                    .requestMatchers("/oauth2/**", "/login/oauth2/**")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.POST,
                        "/api/v1/members",
                        "/api/v1/auth/signup",
                        "/api/v1/auth/login",
                        "/api/v1/auth/refresh",
                        "/api/v1/auth/logout")
                    .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/diaries/public").permitAll()
                    // 관리자 경로는 ADMIN 권한이 필요하다.
                    .requestMatchers("/api/v1/admin/**")
                    .hasRole("ADMIN")
                    // 나머지 /api/v1 경로는 모두 인증이 필요하다.
                    .requestMatchers("/api/v1/**")
                    .authenticated()
                    // 허용 목록에 없는 모든 경로는 기본적으로 차단한다.
                    .anyRequest()
                    .denyAll())
        // 비인증 허용 엔드포인트를 위해 anonymous principal 유지.
        .anonymous(Customizer.withDefaults());

    return http.build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  Clock clock() {
    return Clock.systemUTC();
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
