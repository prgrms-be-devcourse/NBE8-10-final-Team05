package com.back.letter.adapter.in.web;

import com.back.global.rsData.RsData;
import com.back.letter.application.port.in.AdminLetterUseCase;
import com.back.letter.application.port.in.dto.AdminLetterDetailRes;
import com.back.letter.application.port.in.dto.AdminLetterListItem;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/letters")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLetterController {

  private final AdminLetterUseCase adminLetterUseCase;

  @GetMapping
  public RsData<List<AdminLetterListItem>> getList() {
    return new RsData<>("200-1", "관리자 편지 목록을 조회했습니다.", adminLetterUseCase.getAdminLetters());
  }

  @GetMapping("/{id}")
  public RsData<AdminLetterDetailRes> getDetail(@PathVariable Long id) {
    return new RsData<>("200-2", "관리자 편지 상세를 조회했습니다.", adminLetterUseCase.getAdminLetter(id));
  }
}
