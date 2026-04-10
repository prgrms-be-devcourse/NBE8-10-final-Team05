package com.back.home.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.home.adapter.in.web.docs.HomeApiDocs;
import com.back.home.adapter.in.web.dto.HomeStatsResponse;
import com.back.home.application.service.HomeStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/home")
public class HomeController implements HomeApiDocs {

    private final HomeStatsService homeStatsService;

    @GetMapping("/stats")
    public RsData<HomeStatsResponse> getStats() {
        return new RsData<>(
                "200-1",
                "홈 통계를 조회했습니다.",
                homeStatsService.getHomeStats()
        );
    }
}
