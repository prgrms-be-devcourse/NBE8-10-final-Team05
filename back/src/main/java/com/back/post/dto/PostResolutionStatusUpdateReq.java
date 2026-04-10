package com.back.post.dto;

import com.back.post.entity.PostResolutionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "고민 해결 상태 변경 요청")
public record PostResolutionStatusUpdateReq(
        @NotNull(message = "고민 상태는 필수 입력 항목입니다.")
        @Schema(description = "적용할 고민 상태", implementation = PostResolutionStatus.class, example = "RESOLVED")
        PostResolutionStatus resolutionStatus
) {
}
