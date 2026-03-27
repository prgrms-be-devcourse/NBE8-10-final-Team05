package com.back.post.dto;

import com.back.post.entity.PostResolutionStatus;
import jakarta.validation.constraints.NotNull;

public record PostResolutionStatusUpdateReq(
        @NotNull(message = "고민 상태는 필수 입력 항목입니다.")
        PostResolutionStatus resolutionStatus
) {
}
