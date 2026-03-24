package com.back.letter.application.port.in;

import com.back.letter.application.port.in.dto.LetterInfoRes;
import com.back.letter.application.port.in.dto.LetterListRes;

public interface InquiryLetterUseCase {
    LetterInfoRes getLetter(long id, long accessorId);
    LetterListRes getMyInbox(long memberId, int page, int size);
    LetterListRes getMySentBox(long memberId, int page, int size);
}
