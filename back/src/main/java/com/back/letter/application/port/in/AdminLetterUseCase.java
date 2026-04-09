package com.back.letter.application.port.in;

import com.back.letter.application.port.in.dto.AdminLetterDetailRes;
import com.back.letter.application.port.in.dto.AdminLetterHandleReq;
import com.back.letter.application.port.in.dto.AdminLetterListRes;

public interface AdminLetterUseCase {
  AdminLetterListRes getAdminLetters(String status, String query, int page, int size);

  AdminLetterDetailRes getAdminLetter(long id);

  void handleAdminLetter(long id, AdminLetterHandleReq req, long adminMemberId);
}
