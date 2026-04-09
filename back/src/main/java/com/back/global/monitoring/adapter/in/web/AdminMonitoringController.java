package com.back.global.monitoring.adapter.in.web;

import com.back.global.rsData.RsData;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/monitoring")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMonitoringController {

  @GetMapping("/auth")
  public RsData<Void> authorizeMonitoringProxy() {
    return new RsData<>("200-1", "관리자 모니터링 프록시 접근을 확인했습니다.");
  }
}
