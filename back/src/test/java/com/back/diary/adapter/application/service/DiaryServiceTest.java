package com.back.diary.adapter.application.service;

import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.diary.adapter.application.port.out.DiaryPort;
import com.back.diary.domain.Diary;
import com.back.global.exception.ServiceException;
import com.back.image.application.service.ImageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
@DisplayName("DiaryService 1일 1기록 정책 테스트")
class DiaryServiceTest {

    @Mock
    private DiaryPort diaryPort;

    @Mock
    private ImageService imageService;

    @InjectMocks
    private DiaryService diaryService;

    @Test
    @DisplayName("오늘 작성한 일기가 없으면 저장된다")
    void write_savesDiary_whenNoDiaryToday() {
        DiaryCreateReq req = new DiaryCreateReq("제목", "내용", "일상", true);
        given(diaryPort.existsByMemberIdAndCreateDateBetween(eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(false);
        given(diaryPort.save(any(Diary.class))).willAnswer(invocation -> {
            Diary diary = invocation.getArgument(0);
            setId(diary, 10L);
            return diary;
        });

        Long savedId = diaryService.write(req, null, 1L);

        assertThat(savedId).isEqualTo(10L);
        ArgumentCaptor<Diary> captor = ArgumentCaptor.forClass(Diary.class);
        then(diaryPort).should().save(captor.capture());
        assertThat(captor.getValue().getMemberId()).isEqualTo(1L);
        assertThat(captor.getValue().getTitle()).isEqualTo("제목");
    }

    @Test
    @DisplayName("오늘 작성한 일기가 이미 있으면 409 예외가 발생하고 저장하지 않는다")
    void write_throws409_whenDiaryAlreadyExistsToday() {
        DiaryCreateReq req = new DiaryCreateReq("제목", "내용", "일상", true);
        given(diaryPort.existsByMemberIdAndCreateDateBetween(eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                .willReturn(true);

        assertThatThrownBy(() -> diaryService.write(req, null, 1L))
                .isInstanceOf(ServiceException.class)
                .satisfies(exception -> {
                    ServiceException serviceException = (ServiceException) exception;
                    assertThat(serviceException.getRsData().resultCode()).isEqualTo("409-1");
                });

        then(imageService).should(never()).upload(any(), anyString());
        then(diaryPort).should(never()).save(any(Diary.class));
    }

    private void setId(Diary diary, Long id) {
        try {
            Class<?> type = diary.getClass();
            while (type != null) {
                try {
                    var field = type.getDeclaredField("id");
                    field.setAccessible(true);
                    field.set(diary, id);
                    return;
                } catch (NoSuchFieldException ignored) {
                    type = type.getSuperclass();
                }
            }
            throw new IllegalStateException("id field not found");
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
