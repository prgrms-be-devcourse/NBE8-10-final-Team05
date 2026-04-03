package com.back.global.seed;

import com.back.global.rsData.RsData;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile({"k6", "k6-cloud"})
@RequiredArgsConstructor
@RequestMapping("/api/v1/loadtest")
public class K6SeedController {

  private final K6SeedService k6SeedService;

  @PostMapping("/reset")
  @PreAuthorize("hasRole('ADMIN')")
  public RsData<Void> reset() {
    k6SeedService.reset();
    return new RsData<>("200-1", "k6 테스트 데이터 재시딩 완료");
  }
}
