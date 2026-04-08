package com.back.home.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.back.diary.adapter.out.persistence.repository.DiaryRepository;
import com.back.global.time.DateTimeRange;
import com.back.global.time.KstDateRanges;
import com.back.home.adapter.in.web.dto.HomeStatsResponse;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.post.entity.PostCategory;
import com.back.post.repository.PostRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("홈 통계 서비스 테스트")
class HomeStatsServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private LetterRepository letterRepository;
    @Mock private DiaryRepository diaryRepository;
    @Mock private Clock clock;

    @InjectMocks private HomeStatsService homeStatsService;

    @Test
    @DisplayName("홈 통계는 KST 오늘 기준 고민글, 편지, 일기 건수를 집계한다")
    void getHomeStatsAggregatesTodayCounts() {
        Instant now = Instant.parse("2026-04-07T15:30:00Z");
        DateTimeRange todayRange = KstDateRanges.today(Clock.fixed(now, java.time.ZoneOffset.UTC));
        LocalDateTime startOfDay = todayRange.startInclusive();
        LocalDateTime endOfDay = todayRange.endExclusive();

        given(clock.instant()).willReturn(now);
        given(postRepository.countByCategoryAndCreateDateGreaterThanEqualAndCreateDateLessThan(
                PostCategory.WORRY,
                startOfDay,
                endOfDay
        )).willReturn(12L);
        given(letterRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(
                startOfDay,
                endOfDay
        )).willReturn(7L);
        given(diaryRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(
                startOfDay,
                endOfDay
        )).willReturn(3L);

        HomeStatsResponse response = homeStatsService.getHomeStats();

        assertThat(startOfDay).isEqualTo(LocalDateTime.of(2026, 4, 8, 0, 0));
        assertThat(endOfDay).isEqualTo(LocalDateTime.of(2026, 4, 9, 0, 0));
        assertThat(response.todayWorryCount()).isEqualTo(12L);
        assertThat(response.todayLetterCount()).isEqualTo(7L);
        assertThat(response.todayDiaryCount()).isEqualTo(3L);
    }
}
