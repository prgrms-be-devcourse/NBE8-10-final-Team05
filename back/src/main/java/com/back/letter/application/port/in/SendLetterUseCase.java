package com.back.letter.application.port.in;

import com.back.letter.application.port.in.dto.CreateLetterReq;
import com.back.letter.application.port.in.dto.ReplyLetterReq;

public interface SendLetterUseCase {
    long createLetterAndDirectSendLetter(CreateLetterReq req, long senderId);
    void replyLetter(long id, ReplyLetterReq req, long accessorId);
}
