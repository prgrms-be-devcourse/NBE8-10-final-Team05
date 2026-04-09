package com.back.letter.application.port.in;

import com.back.letter.application.port.in.dto.AdminLetterDetailRes;
import com.back.letter.application.port.in.dto.AdminLetterListItem;
import java.util.List;

public interface AdminLetterUseCase {
  List<AdminLetterListItem> getAdminLetters();

  AdminLetterDetailRes getAdminLetter(long id);
}
