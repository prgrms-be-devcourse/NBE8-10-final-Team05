package com.back.diary.adapter.out.persistence.repository;

import com.back.diary.domain.Diary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiaryRepository extends JpaRepository<Diary, Long> {
    // 본인 일기 페이징 조회
    Page<Diary> findAllByMemberIdOrderByCreateDateDesc(Long memberId, Pageable pageable);

    // 공개된 타인 일기 페이징 조회 (선택 사항)
    Page<Diary> findAllByIsPrivateFalseOrderByCreateDateDesc(Pageable pageable);

}
