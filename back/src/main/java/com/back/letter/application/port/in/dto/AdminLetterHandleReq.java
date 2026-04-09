package com.back.letter.application.port.in.dto;

import com.back.letter.domain.AdminLetterActionType;

public record AdminLetterHandleReq(AdminLetterActionType action, String memo) {}
