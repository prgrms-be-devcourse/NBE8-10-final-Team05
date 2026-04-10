package com.back.global.rsData;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(
    description =
        "마음온 API 공통 응답 래퍼입니다. `resultCode`와 `msg`로 처리 결과를 설명하고, 실제 응답 payload는 `data`에 담습니다.")
public record RsData<T>(
    @Schema(description = "애플리케이션 결과 코드", example = "200-1") String resultCode,
    @JsonIgnore @Schema(hidden = true) int statusCode,
    @Schema(description = "사용자에게 표시 가능한 처리 결과 메시지", example = "요청이 성공적으로 처리되었습니다.")
        String msg,
    @Schema(description = "실제 응답 데이터. 엔드포인트별로 스키마가 달라집니다.") T data) {

  public RsData(String resultCode, String msg) {
    this(resultCode, msg, null);
  }

  public RsData(String resultCode, String msg, T data) {
    this(resultCode, Integer.parseInt(resultCode.split("-", 2)[0]), msg, data);
  }
}
