package com.back.letter.domain;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "운영자 편지 조치 유형", example = "NOTE")
public enum AdminLetterActionType {
  NOTE,
  REASSIGN_RECEIVER,
  BLOCK_SENDER
}
