package com.back.letter.service;

import com.back.censorship.adapter.in.web.dto.AuditAiRequest;
import com.back.censorship.adapter.in.web.dto.AuditAiResponse;
import com.back.censorship.application.service.AiService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LetterServiceTest {

    @InjectMocks
    private LetterService letterService;

    @Mock
    private LetterPort letterPort;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private AiService aiService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private LetterRedisRepository letterRedisRepository;
    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private ValueOperations<String, Object> valueOperations;
    @Mock
    private CacheManager cacheManager;
    @Mock
    private Cache cache;

    @BeforeEach
    void setUp() {
        // Redis 관련 설정은 모든 테스트에서 쓰이지 않으므로 반드시 lenient() 처리
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Nested
    @DisplayName("편지 생성 및 발송 테스트")
    class CreateLetter {

        @Test
        @DisplayName("성공: AI 검수를 통과하고 랜덤 수신자에게 발송된다")
        void createAndSend_Success() {
            // given
            long senderId = 1L;
            long receiverId = 2L;
            CreateLetterReq req = new CreateLetterReq("고민제목", "고민내용");

            // 1. Redis 락 설정
            given(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).willReturn(true);

            // 2. AI 검수 설정
            given(aiService.auditContent(any(AuditAiRequest.class)))
                    .willReturn(new AuditAiResponse(true, "letter", "Pass"));

            // 3. 발신자 및 수신자 Mock
            Member sender = mock(Member.class);
            Member receiver = mock(Member.class);

            // [수정] 아래 필드들은 로직 흐름상 필요한 시점에 호출됨
            given(memberRepository.findById(senderId)).willReturn(Optional.of(sender));
            given(letterPort.findRandomMemberExceptMe(senderId)).willReturn(Optional.of(receiver));

            Letter savedLetter = Letter.builder().title(req.title()).build();
            ReflectionTestUtils.setField(savedLetter, "id", 100L);
            given(letterPort.save(any(Letter.class))).willReturn(savedLetter);

            // when
            long resultId = letterService.createLetterAndDirectSendLetter(req, senderId);

            // then
            assertThat(resultId).isEqualTo(100L);
            verify(letterPort).save(any(Letter.class));
        }

        @Test
        @DisplayName("실패: AI 검수 부적절 판정 시 로직 중단")
        void createAndSend_AiFail() {
            // given
            long senderId = 1L;
            CreateLetterReq req = new CreateLetterReq("나쁜제목", "나쁜내용");

            given(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).willReturn(true);
            given(aiService.auditContent(any()))
                    .willReturn(new AuditAiResponse(false, "letter", "부적절"));

            // then: AI 검수 이후의 memberRepository.findById 등은 호출되지 않으므로 작성하지 않음
            assertThatThrownBy(() -> letterService.createLetterAndDirectSendLetter(req, senderId))
                    .isInstanceOf(ServiceException.class);
        }

        @Test
        @DisplayName("실패: 수신 대상이 없는 경우")
        void createAndSend_NoReceiver() {
            // given
            long senderId = 1L;
            given(valueOperations.setIfAbsent(anyString(), any(), any(Duration.class))).willReturn(true);

            Member sender = mock(Member.class);
            given(memberRepository.findById(senderId)).willReturn(Optional.of(sender));

            given(aiService.auditContent(any(AuditAiRequest.class)))
                    .willReturn(new AuditAiResponse(true, "letter", "Pass"));

            // 수신자 없음 설정
            given(letterPort.findRandomMemberExceptMe(senderId)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> letterService.createLetterAndDirectSendLetter(new CreateLetterReq("제목", "내용"), senderId))
                    .isInstanceOf(ServiceException.class);
        }
    }

    @Nested
    @DisplayName("답장 및 조회 테스트")
    class LetterOther {

        @Test
        @DisplayName("성공: 답장 작성 시 상태 변경 및 캐시 삭제")
        void reply_Success() {
            // given
            long letterId = 10L;
            long receiverId = 1L;
            long senderId = 2L;
            ReplyLetterReq req = new ReplyLetterReq("답장");

            Member sender = mock(Member.class);
            Member receiver = mock(Member.class);
            lenient().when(sender.getId()).thenReturn(senderId);
            lenient().when(receiver.getId()).thenReturn(receiverId);

            given(aiService.auditContent(any())).willReturn(new AuditAiResponse(true, "reply", "Pass"));
            given(cacheManager.getCache("mailboxStats")).willReturn(cache);

            Letter letter = Letter.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .status(LetterStatus.SENT)
                    .build();
            ReflectionTestUtils.setField(letter, "id", letterId);

            given(letterPort.findById(letterId)).willReturn(Optional.of(letter));

            // when
            letterService.replyLetter(letterId, req, receiverId);

            // then
            assertThat(letter.getStatus()).isEqualTo(LetterStatus.REPLIED);
            verify(cache).evict(senderId);
        }

        @Test
        @DisplayName("성공: 수신함 조회")
        void getInbox_Success() {
            // given
            long memberId = 1L;
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id").descending());
            Page<Letter> page = new PageImpl<>(List.of());

            // eq(memberId) 사용 시 타입 일치 주의
            given(letterPort.findByReceiverId(eq(memberId), any(Pageable.class))).willReturn(page);

            // when
            LetterListRes result = letterService.getMyInbox(memberId, 0, 10);

            // then
            assertThat(result.letters()).isEmpty();
        }
    }

    @Nested
    @DisplayName("보관함 및 상세 조회 테스트")
    class LetterInquiry {

        @Test
        @DisplayName("성공: 수신함(Inbox)을 조회한다")
        void getInbox_Success() {
            // given
            long memberId = 1L;
            Pageable pageable = PageRequest.of(0, 10, Sort.by("id").descending());

            Letter letter = Letter.builder()
                    .title("받은 제목")
                    .status(LetterStatus.SENT)
                    .build();
            ReflectionTestUtils.setField(letter, "id", 1L);

            Page<Letter> page = new PageImpl<>(List.of(letter), pageable, 1);
            given(letterPort.findByReceiverId(eq(memberId), any(Pageable.class))).willReturn(page);

            // when
            LetterListRes result = letterService.getMyInbox(memberId, 0, 10);

            // then
            assertThat(result.letters()).hasSize(1);
        }

        @Test
        @DisplayName("성공: 편지 상세 내용을 조회한다")
        void getLetterDetail_Success() {
            // given
            long letterId = 1L;
            long myId = 10L;

            Member sender = mock(Member.class);
            given(sender.getId()).willReturn(5L);
            Member receiver = mock(Member.class);
            given(receiver.getId()).willReturn(myId);

            Letter letter = Letter.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .title("상세 제목")
                    .content("상세 내용")
                    .status(LetterStatus.SENT)
                    .build();
            ReflectionTestUtils.setField(letter, "id", letterId);

            given(letterPort.findById(letterId)).willReturn(Optional.of(letter));

            // when
            LetterInfoRes result = letterService.getLetter(letterId, myId);

            // then
            assertThat(result.title()).isEqualTo("상세 제목");
        }
    }
}
