package com.back.diary.repository;

import com.back.diary.entity.Diary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DiaryRepository extends JpaRepository<Diary, Long> {
    List<Diary> findAllByMemberIdOrderByCreateDateDesc(Long memberId);

}
