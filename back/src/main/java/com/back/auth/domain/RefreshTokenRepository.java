package com.back.auth.domain;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 리프레시 토큰 조회/추적용 JPA 리포지토리. */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

  /** jti로 토큰 단건 조회. */
  Optional<RefreshToken> findByJti(String jti);

  /** 같은 refresh 토큰 동시 회전 경쟁을 막기 위해 jti 행을 배타 잠금으로 조회한다. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select refreshToken from RefreshToken refreshToken where refreshToken.jti = :jti")
  Optional<RefreshToken> findByJtiForUpdate(@Param("jti") String jti);

  /** 활성 조건(미폐기 + 미만료)을 만족하는 토큰 조회. */
  Optional<RefreshToken> findByJtiAndRevokedAtIsNullAndExpiresAtAfter(
      String jti, LocalDateTime now);

  /** 동일 familyId(회전 체인) 토큰 목록 조회. */
  List<RefreshToken> findAllByFamilyIdOrderByIdAsc(String familyId);
}
