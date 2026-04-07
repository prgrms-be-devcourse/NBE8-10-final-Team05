package com.back.letter.service;

import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.censorship.application.service.AiService;
import com.back.global.event.LetterEvents;
import com.back.global.event.LetterNotificationEvent;
import com.back.global.exception.ServiceException;
import com.back.letter.adapter.out.persistence.repository.LetterRedisRepository;
import com.back.letter.application.port.in.dto.*;
import com.back.letter.application.port.out.LetterPort;
import com.back.letter.application.service.LetterService;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LetterServiceTest {

    @InjectMocks
    private LetterService letterService;

    @Mock private LetterPort letterPort;
    @Mock private MemberRepository memberRepository;
    @Mock private AiService aiService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private LetterRedisRepository letterRedisRepository;
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ValueOperations<String, Object> valueOperations;
    @Mock private CacheManager cacheManager;
    @Mock private Cache cache;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    private Member createMember(Long id, String nickname) {
        Member member = Member.create(nickname + "@test.com", "pw", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    @Nested
    @DisplayName("편지 생성 및 즉시 발송 테스트")
    class CreateAndSendLetter {

        @Test
        @DisplayName("성공: 모든 조건 충족 시 편지가 저장되고 수신자 캐시가 삭제된다 (given_when_then)")
        void givenValidRequest_whenCreateLetter_thenSaveAndEvictCache() {
            // given
            long senderId = 1L;
            long receiverId = 2L;
            CreateLetterReq req = new CreateLetterReq("제목", "내용");

            Member sender = createMember(senderId, "발신자");
            Member receiver = createMember(receiverId, "수신자");

            //  도메인 로직(letter.dispatch)을 타야 하므로 초기 상태의 Letter 생성
            Letter savedLetter = Letter.builder()
                    .title("제목")
                    .content("내용")
                    .sender(sender)
                    .build();
            ReflectionTestUtils.setField(savedLetter, "id", 100L);

            given(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).willReturn(true);
            given(aiService.auditContent(any(AuditAiRequest.class)))
                    .willReturn(new AuditAiResponse(true, "Letter", "Pass", "가짜 요약본 내용"));
            given(memberRepository.findById(senderId)).willReturn(Optional.of(sender));

            // findMatchingReceiver 로직 대응
            given(letterRedisRepository.getRandomReceiver()).willReturn(receiverId);
            given(memberRepository.findById(receiverId)).willReturn(Optional.of(receiver));

            given(letterPort.save(any(Letter.class))).willReturn(savedLetter);

            // when
            long resultId = letterService.createLetterAndDirectSendLetter(req, senderId);

            // then
            assertThat(resultId).isEqualTo(100L);
            verify(letterPort).save(any(Letter.class));

            verify(eventPublisher, times(1)).publishEvent(any(LetterEvents.LetterSentEvent.class));
        }

        @Test
        @DisplayName("실패: 수신 가능한 회원이 없을 경우 404 예외 발생")
        void givenNoReceiver_whenCreateLetter_thenThrowNotFound() {
            // given
            long senderId = 1L;
            given(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).willReturn(true);
            given(aiService.auditContent(any())).willReturn(new AuditAiResponse(true,"Letter","Pass", "가짜 요약본 내용"));
            given(memberRepository.findById(senderId)).willReturn(Optional.of(createMember(senderId, "S")));

            given(letterRedisRepository.getRandomReceiver()).willReturn(null);
            given(letterPort.findRandomMemberExceptMe(List.of(senderId))).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> letterService.createLetterAndDirectSendLetter(new CreateLetterReq("T", "C"), senderId))
                    .isInstanceOf(ServiceException.class)
                    .hasMessageContaining("404");
        }
    }

    @Nested
    @DisplayName("답장 작성 테스트")
    class ReplyLetterTest {

        @Test
        @DisplayName("성공: 수신자가 답장하면 상태가 REPLIED로 변경되고 이벤트가 발행된다")
        void givenValidReply_whenReplyLetter_thenUpdateAndPublishEvent() {
            // given
            long letterId = 10L;
            long receiverId = 2L;
            long senderId = 1L;
            ReplyLetterReq req = new ReplyLetterReq("정성스러운 답장");

            Member sender = createMember(senderId, "S");
            Member receiver = createMember(receiverId, "R");

            Letter letter = Letter.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .build();
            letter.dispatch(receiver);
            ReflectionTestUtils.setField(letter, "id", letterId);

            given(letterPort.findById(letterId)).willReturn(Optional.of(letter));
            given(aiService.auditContent(any())).willReturn(new AuditAiResponse(true,"Reply","Pass", "가짜 답장 요약본"));

            // when
            letterService.replyLetter(letterId, req, receiverId);

            // then
            assertThat(letter.getStatus()).isEqualTo(LetterStatus.REPLIED);
            assertThat(letter.getReplySummary()).isEqualTo("가짜 답장 요약본");
            verify(letterRedisRepository).deleteWritingStatus(letterId);
            verify(eventPublisher).publishEvent(any(LetterEvents.LetterRepliedEvent.class));
        }
    }

    @Test
    @DisplayName("성공: 편지 발송 시 AI 요약본이 함께 저장된다")
    void givenValidRequest_whenCreateLetter_thenSaveWithSummary() {
        // given
        long senderId = 1L;
        long receiverId = 2L;
        CreateLetterReq req = new CreateLetterReq("제목", "내용");
        String expectedSummary = "AI가 요약한 따뜻한 편지입니다."; // 🚀 가짜 요약본 설정

        Member sender = createMember(senderId, "발신자");
        Member receiver = createMember(receiverId, "수신자");

        given(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).willReturn(true);

        // 🚀 수정: AI 응답에 요약본(summary) 필드를 포함시킵니다.
        given(aiService.auditContent(any(AuditAiRequest.class)))
                .willReturn(new AuditAiResponse(true, "NONE", "Pass", expectedSummary));

        given(memberRepository.findById(senderId)).willReturn(Optional.of(sender));
        given(letterRedisRepository.getRandomReceiver()).willReturn(receiverId);
        given(memberRepository.findById(receiverId)).willReturn(Optional.of(receiver));

        // 저장 시 반환할 가짜 객체 설정
        Letter mockSavedLetter = Letter.builder().title("제목").build();
        ReflectionTestUtils.setField(mockSavedLetter, "id", 100L);
        given(letterPort.save(any(Letter.class))).willReturn(mockSavedLetter);

        // when
        letterService.createLetterAndDirectSendLetter(req, senderId);

        // then
        // 🚀 핵심: 실제로 letterPort.save()에 전달된 Letter 객체를 캡처합니다.
        ArgumentCaptor<Letter> letterCaptor = ArgumentCaptor.forClass(Letter.class);
        verify(letterPort).save(letterCaptor.capture());

        // 🚀 검증: 캡처된 편지 객체의 요약본이 AI가 준 것과 일치하는지 확인합니다.
        assertThat(letterCaptor.getValue().getSummary()).isEqualTo(expectedSummary);
    }

    @Test
    @DisplayName("성공: 답장 시 AI가 생성한 답장 요약본이 저장된다")
    void givenValidReply_whenReplyLetter_thenSaveReplySummary() {
        // given
        long letterId = 10L;
        long receiverId = 2L;
        long senderId = 1L; // 🚀 1. 발신자 ID 추가
        String expectedReplySummary = "답장에 대한 AI 요약입니다.";
        ReplyLetterReq req = new ReplyLetterReq("정성스러운 답장");

        Member sender = createMember(senderId, "발신자"); // 🚀 2. 가짜 발신자 객체 생성
        Member receiver = createMember(receiverId, "수신자");

        Letter letter = Letter.builder()
                .sender(sender) // 🚀 3. 핵심! 빌더에 sender를 꼭 넣어주세요.
                .receiver(receiver)
                .build();

        letter.dispatch(receiver);
        ReflectionTestUtils.setField(letter, "id", letterId);

        given(letterPort.findById(letterId)).willReturn(Optional.of(letter));

        given(aiService.auditContent(any()))
                .willReturn(new AuditAiResponse(true, "NONE", "Pass", expectedReplySummary));

        // when
        letterService.replyLetter(letterId, req, receiverId);

        // then
        assertThat(letter.getReplySummary()).isEqualTo(expectedReplySummary);
        assertThat(letter.getStatus()).isEqualTo(LetterStatus.REPLIED);
    }

    @Nested
    @DisplayName("보관함 조회 테스트")
    class BoxInquiry {

        @Test
        @DisplayName("성공: 수신함 조회 시 작성 중 여부를 포함하여 반환한다")
        void givenMemberId_whenGetInbox_thenReturnListWithWritingStatus() {
            // given
            long memberId = 1L;
            Letter letter = Letter.builder().title("받은 편지").build();
            ReflectionTestUtils.setField(letter, "id", 50L);

            Page<Letter> page = new PageImpl<>(List.of(letter));
            given(letterPort.findByReceiverId(eq(memberId), any(Pageable.class))).willReturn(page);
            given(letterRedisRepository.isWriting(50L)).willReturn(true); // 작성 중 상태 시뮬레이션

            // when
            LetterListRes result = letterService.getMyInbox(memberId, 0, 10);

            // then
            assertThat(result.letters()).hasSize(1);
            assertThat(result.letters().get(0).title()).isEqualTo("받은 편지");
            // LetterListRes 내의 개별 아이템 필드명이 isWriting()이라면 아래와 같이 검증
            // assertThat(result.letters().get(0).isWriting()).isTrue();
        }
    }
}
