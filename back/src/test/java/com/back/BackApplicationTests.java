package com.back;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
@DisplayName("애플리케이션 부팅 통합 테스트")
class BackApplicationTests {

  @Container @ServiceConnection
  static PostgreSQLContainer<?> postgreSQLContainer =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("maum_on_test")
          .withUsername("test")
          .withPassword("test");

  @Test
  @DisplayName("스프링 컨텍스트가 정상적으로 로드된다")
  void contextLoads() {}
}
