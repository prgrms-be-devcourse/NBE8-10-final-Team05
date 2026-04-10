package com.back.global.seed.docs;

import com.back.global.rsData.RsData;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(
    name = "부하테스트",
    description =
        "k6 전용 프로필에서만 노출되는 테스트 데이터 초기화 API입니다. 운영/일반 사용자 기능이 아니라 부하 테스트 시나리오 준비용입니다.")
public interface K6SeedApiDocs {

  @Operation(
      summary = "k6 테스트 데이터 재시딩",
      description =
          "부하 테스트에 필요한 게시글/일기/편지/회원 데이터를 초기 상태로 다시 구성합니다. "
              + "k6 또는 k6-cloud 프로필에서만 활성화되며 관리자 권한이 필요합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "재시딩 성공"),
    @ApiResponse(responseCode = "403", description = "관리자 권한 필요")
  })
  RsData<Void> reset();
}
