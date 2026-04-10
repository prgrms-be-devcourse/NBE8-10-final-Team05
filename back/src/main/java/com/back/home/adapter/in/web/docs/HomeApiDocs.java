package com.back.home.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.home.adapter.in.web.dto.HomeStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(
    name = "홈",
    description =
        "서비스 메인 화면에서 사용하는 요약 통계 API입니다. 오늘 생성된 고민/편지/일기 수를 제공해 서비스 활동량을 빠르게 보여줍니다.")
public interface HomeApiDocs {

  @Operation(
      summary = "홈 통계 조회",
      description = "오늘 기준 고민 게시글 수, 편지 수, 일기 수를 집계해 반환합니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공")
  })
  RsData<HomeStatsResponse> getStats();
}
