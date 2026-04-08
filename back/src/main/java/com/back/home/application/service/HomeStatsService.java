package com.back.home.application.service;

import com.back.diary.adapter.out.persistence.repository.DiaryRepository;
import com.back.global.time.DateTimeRange;
import com.back.global.time.KstDateRanges;
import com.back.home.adapter.in.web.dto.HomeStatsResponse;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.post.entity.PostCategory;
import com.back.post.repository.PostRepository;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HomeStatsService {

    private final PostRepository postRepository;
    private final LetterRepository letterRepository;
    private final DiaryRepository diaryRepository;
    private final Clock clock;

    public HomeStatsResponse getHomeStats() {
        DateTimeRange todayRange = KstDateRanges.today(clock);

        return new HomeStatsResponse(
                postRepository.countByCategoryAndCreateDateGreaterThanEqualAndCreateDateLessThan(
                        PostCategory.WORRY,
                        todayRange.startInclusive(),
                        todayRange.endExclusive()
                ),
                letterRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(
                        todayRange.startInclusive(),
                        todayRange.endExclusive()
                ),
                diaryRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(
                        todayRange.startInclusive(),
                        todayRange.endExclusive()
                )
        );
    }
}
