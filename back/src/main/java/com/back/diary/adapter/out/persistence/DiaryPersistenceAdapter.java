package com.back.diary.adapter.out.persistence;

import com.back.diary.adapter.application.port.out.DiaryPort;
import com.back.diary.adapter.out.persistence.repository.DiaryRepository;
import com.back.diary.domain.Diary;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DiaryPersistenceAdapter implements DiaryPort {

    private final DiaryRepository diaryRepository;

    @Override
    public Diary save(Diary diary) {
        return diaryRepository.save(diary);
    }

    @Override
    public Optional<Diary> findById(Long id) {
        return diaryRepository.findById(id);
    }

    @Override
    public Page<Diary> findAllByMemberId(Long memberId, Pageable pageable) {
        return diaryRepository.findAllByMemberIdOrderByCreateDateDesc(memberId, pageable);
    }

    @Override
    public Page<Diary> findAllPublic(Pageable pageable) {
        return diaryRepository.findAllByIsPrivateFalseOrderByCreateDateDesc(pageable);
    }

    @Override
    public boolean existsByMemberIdAndCreateDateBetween(
            Long memberId,
            LocalDateTime startInclusive,
            LocalDateTime endExclusive
    ) {
        return diaryRepository.existsByMemberIdAndCreateDateGreaterThanEqualAndCreateDateLessThan(
                memberId,
                startInclusive,
                endExclusive
        );
    }

    @Override
    public void delete(Diary diary) {
        diaryRepository.delete(diary);
    }
}
