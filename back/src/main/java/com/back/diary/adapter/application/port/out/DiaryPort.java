package com.back.diary.adapter.application.port.out;

import com.back.diary.domain.Diary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

// 위치: com.back.diary.adapter.application.port.out
public interface DiaryPort {
    Diary save(Diary diary);
    Optional<Diary> findById(Long id);
    Page<Diary> findAllByMemberId(Long memberId, Pageable pageable);
    Page<Diary> findAllPublic(Pageable pageable);
    void delete(Diary diary);
}
