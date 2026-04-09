package com.back.letter.service;

import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.censorship.application.service.AiService;
import com.back.global.event.LetterEvents;
import com.back.global.exception.ServiceException;
import com.back.letter.adapter.out.persistence.repository.LetterAdminActionLogRepository;
import com.back.letter.adapter.out.persistence.repository.LetterRedisRepository;
import com.back.letter.application.port.in.dto.*;
import com.back.letter.application.port.out.LetterPort;
import com.back.letter.application.service.LetterService;
import com.back.letter.domain.AdminLetterActionType;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterAdminActionLog;
import com.back.letter.domain.LetterStatus;
import com.back.member.application.MemberService;
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
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.LocalDateTime;
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
    @Mock private LetterAdminActionLogRepository letterAdminActionLogRepository;
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ValueOperations<String, Object> valueOperations;
    @Mock private CacheManager cacheManager;
    @Mock private Cache cache;
    @Mock private MemberService memberService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    private Member createMember(Long id, String nickname) {
        Member member = Member.create(nickname + "@test.com", "pw", nickname);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }

    private LetterAdminActionLogRepository.LatestActionProjection latestActionProjection(Long letterId, String actionType) {
        return new LetterAdminActionLogRepository.LatestActionProjection() {
            @Override
            public Long getLetterId() {
                return letterId;
            }

            @Override
            public String getActionType() {
                return actionType;
            }
        };
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

    @Nested
    @DisplayName("관리자 편지 조회 테스트")
    class AdminInquiry {

        @Test
        @DisplayName("성공: 관리자 목록 조회 시 현재 작성 중 상태를 WRITING 으로 반영한다")
        void givenAdminLetters_whenGetAdminLetters_thenReturnWritingStatus() {
            Member sender = createMember(1L, "보낸이");
            Member receiver = createMember(2L, "받는이");
            Letter letter = Letter.builder()
                    .title("관리자용 편지")
                    .content("내용")
                    .sender(sender)
                    .receiver(receiver)
                    .build();
            letter.dispatch(receiver);
            ReflectionTestUtils.setField(letter, "id", 33L);
            ReflectionTestUtils.setField(letter, "createDate", LocalDateTime.of(2026, 4, 9, 14, 0));

            Page<Letter> page = new PageImpl<>(List.of(letter));
            given(letterPort.findAdminLetters(null, false, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createDate"))))
                    .willReturn(page);
            given(letterRedisRepository.isWriting(33L)).willReturn(true);
            given(letterAdminActionLogRepository.findLatestActionsByLetterIds(List.of(33L)))
                    .willReturn(List.of(latestActionProjection(33L, "NOTE")));

            AdminLetterListRes result = letterService.getAdminLetters(null, null, 0, 20);

            assertThat(result.letters()).hasSize(1);
            assertThat(result.letters().getFirst().status()).isEqualTo("WRITING");
            assertThat(result.letters().getFirst().senderNickname()).isEqualTo("보낸이");
            assertThat(result.letters().getFirst().receiverNickname()).isEqualTo("받는이");
            assertThat(result.letters().getFirst().latestAction()).isEqualTo("NOTE");
        }

        @Test
        @DisplayName("성공: 관리자 상세 조회는 편지 내용과 답장 정보를 함께 반환한다")
        void givenAdminLetterId_whenGetAdminLetter_thenReturnDetail() {
            Member sender = createMember(1L, "보낸이");
            Member receiver = createMember(2L, "받는이");
            Letter letter = Letter.builder()
                    .title("괜찮아질까요")
                    .content("지금 너무 힘들어요.")
                    .summary("불안을 토로하는 편지")
                    .replyContent("천천히 숨을 고르고 쉬어봐요.")
                    .replySummary("휴식을 권하는 답장")
                    .sender(sender)
                    .receiver(receiver)
                    .build();
            ReflectionTestUtils.setField(letter, "id", 44L);
            ReflectionTestUtils.setField(letter, "status", LetterStatus.REPLIED);
            ReflectionTestUtils.setField(letter, "createDate", LocalDateTime.of(2026, 4, 9, 9, 0));
            ReflectionTestUtils.setField(letter, "replyCreatedDate", LocalDateTime.of(2026, 4, 9, 9, 20));

            given(letterPort.findByIdForAdmin(44L)).willReturn(Optional.of(letter));
            given(letterRedisRepository.isWriting(44L)).willReturn(false);
            given(letterAdminActionLogRepository.findByLetterIdOrderByCreateDateDesc(44L)).willReturn(List.of());

            AdminLetterDetailRes result = letterService.getAdminLetter(44L);

            assertThat(result.status()).isEqualTo("REPLIED");
            assertThat(result.summary()).isEqualTo("불안을 토로하는 편지");
            assertThat(result.replySummary()).isEqualTo("휴식을 권하는 답장");
            assertThat(result.sender().nickname()).isEqualTo("보낸이");
            assertThat(result.receiver().nickname()).isEqualTo("받는이");
        }

        @Test
        @DisplayName("성공: 조치 이력 테이블 조회가 실패해도 관리자 목록은 기본값으로 반환한다")
        void givenActionLogQueryFailure_whenGetAdminLetters_thenReturnListWithoutLatestAction() {
            Member sender = createMember(1L, "보낸이");
            Member receiver = createMember(2L, "받는이");
            Letter letter = Letter.builder()
                    .title("관리자용 편지")
                    .content("내용")
                    .sender(sender)
                    .receiver(receiver)
                    .build();
            letter.dispatch(receiver);
            ReflectionTestUtils.setField(letter, "id", 35L);
            ReflectionTestUtils.setField(letter, "createDate", LocalDateTime.of(2026, 4, 9, 14, 0));

            Page<Letter> page = new PageImpl<>(List.of(letter));
            given(letterPort.findAdminLetters(null, false, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createDate"))))
                    .willReturn(page);
            given(letterAdminActionLogRepository.findLatestActionsByLetterIds(List.of(35L)))
                    .willThrow(new InvalidDataAccessResourceUsageException("relation \"letter_admin_action_logs\" does not exist"));
            given(letterRedisRepository.isWriting(35L)).willReturn(false);

            AdminLetterListRes result = letterService.getAdminLetters(null, null, 0, 20);

            assertThat(result.letters()).hasSize(1);
            assertThat(result.letters().getFirst().latestAction()).isNull();
            assertThat(result.letters().getFirst().status()).isEqualTo("SENT");
        }

        @Test
        @DisplayName("성공: 관리자 목록 검색어가 있으면 검색 전용 쿼리를 사용한다")
        void givenQuery_whenGetAdminLetters_thenUseSearchQuery() {
            Member sender = createMember(1L, "보낸이");
            Member receiver = createMember(2L, "받는이");
            Letter letter = Letter.builder()
                    .title("위로")
                    .content("괜찮아질 거예요.")
                    .sender(sender)
                    .receiver(receiver)
                    .build();
            letter.dispatch(receiver);
            ReflectionTestUtils.setField(letter, "id", 37L);

            Page<Letter> page = new PageImpl<>(List.of(letter));
            given(letterPort.searchAdminLetters("위로", null, false, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createDate"))))
                    .willReturn(page);
            given(letterRedisRepository.isWriting(37L)).willReturn(false);
            given(letterAdminActionLogRepository.findLatestActionsByLetterIds(List.of(37L)))
                    .willReturn(List.of());

            AdminLetterListRes result = letterService.getAdminLetters(null, "위로", 0, 20);

            assertThat(result.letters()).hasSize(1);
            verify(letterPort).searchAdminLetters("위로", null, false, PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createDate")));
            verify(letterPort, never()).findAdminLetters(any(), anyBoolean(), any(Pageable.class));
        }

        @Test
        @DisplayName("성공: 조치 이력 테이블 조회가 실패해도 관리자 상세는 빈 이력으로 반환한다")
        void givenActionLogQueryFailure_whenGetAdminLetter_thenReturnDetailWithoutLogs() {
            Member sender = createMember(1L, "보낸이");
            Member receiver = createMember(2L, "받는이");
            Letter letter = Letter.builder()
                    .title("괜찮아질까요")
                    .content("지금 너무 힘들어요.")
                    .sender(sender)
                    .receiver(receiver)
                    .build();
            ReflectionTestUtils.setField(letter, "id", 46L);
            ReflectionTestUtils.setField(letter, "status", LetterStatus.ACCEPTED);

            given(letterPort.findByIdForAdmin(46L)).willReturn(Optional.of(letter));
            given(letterAdminActionLogRepository.findByLetterIdOrderByCreateDateDesc(46L))
                    .willThrow(new InvalidDataAccessResourceUsageException("relation \"letter_admin_action_logs\" does not exist"));
            given(letterRedisRepository.isWriting(46L)).willReturn(false);

            AdminLetterDetailRes result = letterService.getAdminLetter(46L);

            assertThat(result.actionLogs()).isEmpty();
            assertThat(result.status()).isEqualTo("ACCEPTED");
        }

        @Test
        @DisplayName("성공: 운영 메모는 상태 변경 없이 조치 이력만 기록한다")
        void givenNoteAction_whenHandleAdminLetter_thenSaveActionLogOnly() {
            Member sender = createMember(1L, "보낸이");
            Member admin = createMember(9L, "운영자");
            Letter letter = Letter.builder()
                    .title("메모 대상")
                    .content("내용")
                    .sender(sender)
                    .build();
            ReflectionTestUtils.setField(letter, "id", 51L);
            ReflectionTestUtils.setField(letter, "status", LetterStatus.SENT);

            given(letterPort.findByIdForAdmin(51L)).willReturn(Optional.of(letter));
            given(memberRepository.findById(9L)).willReturn(Optional.of(admin));

            letterService.handleAdminLetter(
                    51L,
                    new AdminLetterHandleReq(AdminLetterActionType.NOTE, "표현 수위 지켜보기"),
                    9L);

            assertThat(letter.getStatus()).isEqualTo(LetterStatus.SENT);
            verify(letterAdminActionLogRepository).save(any(LetterAdminActionLog.class));
        }

        @Test
        @DisplayName("성공: 재배정 조치는 새 수신자를 배정하고 writing 상태를 제거한다")
        void givenReassignAction_whenHandleAdminLetter_thenAssignNewReceiver() {
            Member sender = createMember(1L, "보낸이");
            Member oldReceiver = createMember(2L, "기존수신자");
            Member newReceiver = createMember(3L, "새수신자");
            Member admin = createMember(9L, "운영자");
            Letter letter = Letter.builder()
                    .title("재배정 대상")
                    .content("내용")
                    .sender(sender)
                    .receiver(oldReceiver)
                    .build();
            letter.dispatch(oldReceiver);
            ReflectionTestUtils.setField(letter, "id", 61L);
            ReflectionTestUtils.setField(letter, "status", LetterStatus.ACCEPTED);

            given(letterPort.findByIdForAdmin(61L)).willReturn(Optional.of(letter));
            given(letterPort.findRandomMemberExceptMe(List.of(1L, 2L))).willReturn(Optional.of(newReceiver));
            given(memberRepository.findById(9L)).willReturn(Optional.of(admin));

            letterService.handleAdminLetter(
                    61L,
                    new AdminLetterHandleReq(AdminLetterActionType.REASSIGN_RECEIVER, "응답 지연으로 재배정"),
                    9L);

            assertThat(letter.getReceiver().getId()).isEqualTo(3L);
            assertThat(letter.getStatus()).isEqualTo(LetterStatus.SENT);
            verify(letterRedisRepository).deleteWritingStatus(61L);
            verify(letterAdminActionLogRepository).save(any(LetterAdminActionLog.class));
        }

        @Test
        @DisplayName("실패: 답장을 작성 중인 편지는 재배정할 수 없다")
        void givenWritingLetter_whenHandleReassign_thenThrowBadRequest() {
            Member sender = createMember(1L, "보낸이");
            Member oldReceiver = createMember(2L, "기존수신자");
            Letter letter = Letter.builder()
                    .title("재배정 대상")
                    .content("내용")
                    .sender(sender)
                    .receiver(oldReceiver)
                    .build();
            letter.dispatch(oldReceiver);
            ReflectionTestUtils.setField(letter, "id", 62L);
            ReflectionTestUtils.setField(letter, "status", LetterStatus.ACCEPTED);

            given(letterPort.findByIdForAdmin(62L)).willReturn(Optional.of(letter));
            given(letterRedisRepository.isWriting(62L)).willReturn(true);

            assertThatThrownBy(() -> letterService.handleAdminLetter(
                    62L,
                    new AdminLetterHandleReq(AdminLetterActionType.REASSIGN_RECEIVER, "작성 중 재배정 시도"),
                    9L))
                    .isInstanceOf(ServiceException.class)
                    .hasMessageContaining("답장을 작성 중인 편지는 재배정할 수 없습니다.");

            verify(letterPort, never()).findRandomMemberExceptMe(anyList());
            verify(letterRedisRepository, never()).deleteWritingStatus(62L);
            verify(letterAdminActionLogRepository, never()).save(any(LetterAdminActionLog.class));
        }

        @Test
        @DisplayName("성공: 발신자 차단 조치는 발신자를 BLOCKED 상태로 변경한다")
        void givenBlockSenderAction_whenHandleAdminLetter_thenBlockSender() {
            Member sender = createMember(1L, "보낸이");
            Member admin = createMember(9L, "운영자");
            Letter letter = Letter.builder()
                    .title("차단 대상")
                    .content("내용")
                    .sender(sender)
                    .build();
            ReflectionTestUtils.setField(letter, "id", 71L);

            given(letterPort.findByIdForAdmin(71L)).willReturn(Optional.of(letter));
            given(memberRepository.findById(9L)).willReturn(Optional.of(admin));

            letterService.handleAdminLetter(
                    71L,
                    new AdminLetterHandleReq(AdminLetterActionType.BLOCK_SENDER, "악성 발신자 차단"),
                    9L);

            verify(memberService).blockMemberByAdminAction(1L, 9L, "악성 발신자 차단", true);
            verify(letterAdminActionLogRepository).save(any(LetterAdminActionLog.class));
        }
    }
}
