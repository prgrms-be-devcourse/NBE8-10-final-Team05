package com.back.letter.service;

import com.back.ai.dto.AuditAiRequest;
import com.back.ai.dto.AuditAiResponse;
import com.back.ai.service.AiService;
import com.back.global.exception.ServiceException;
import com.back.letter.application.service.LetterService;
import com.back.letter.application.port.in.dto.CreateLetterReq;
import com.back.letter.application.port.in.dto.LetterInfoRes;
import com.back.letter.application.port.in.dto.LetterListRes;
import com.back.letter.application.port.in.dto.ReplyLetterReq;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;
import org.springframework.test.util.ReflectionTestUtils;

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
    private LetterRepository letterRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private AiService aiService;

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

            Member sender = mock(Member.class);
            Member receiver = mock(Member.class);
            given(sender.getId()).willReturn(senderId);
            given(receiver.getId()).willReturn(receiverId);

            given(aiService.auditContent(any(AuditAiRequest.class)))
                    .willReturn(new AuditAiResponse(true, "letter", "Pass"));
            given(memberRepository.findById(senderId)).willReturn(Optional.of(sender));
            given(letterRepository.findRandomMemberExceptMe(senderId)).willReturn(Optional.of(receiver));

            Letter savedLetter = Letter.builder().title(req.title()).build();
            ReflectionTestUtils.setField(savedLetter, "id", 100L);
            given(letterRepository.save(any(Letter.class))).willReturn(savedLetter);

            // when
            long resultId = letterService.createLetterAndDirectSendLetter(req, senderId);

            // then
            assertThat(resultId).isEqualTo(100L);
            verify(letterRepository, times(1)).save(any(Letter.class));
        }

        @Test
        @DisplayName("실패: AI 검수에서 부적절한 콘텐츠로 판정되면 예외가 발생한다")
        void createAndSend_AiFail() {
            // given
            CreateLetterReq req = new CreateLetterReq("나쁜제목", "나쁜내용");
            given(aiService.auditContent(any()))
                    .willReturn(new AuditAiResponse(false, "letter", "부적절한 내용이 포함되어 있습니다."));

            // when & then
            assertThatThrownBy(() -> letterService.createLetterAndDirectSendLetter(req, 1L))
                    .isInstanceOf(ServiceException.class)
                    .hasMessageContaining("부적절한 내용");
        }

        @Test
        @DisplayName("실패: 나를 제외한 활성 사용자가 없어 발송 대상이 없는 경우")
        void createAndSend_NoReceiver() {
            // given
            long senderId = 1L; // 명확하게 ID 정의
            Member sender = mock(Member.class);
            given(sender.getId()).willReturn(senderId); // 중요: sender.getId()가 1L을 반환하게 함

            given(aiService.auditContent(any())).willReturn(new AuditAiResponse(true, "letter", "Pass"));
            given(memberRepository.findById(senderId)).willReturn(Optional.of(sender));

            // findRandomMemberExceptMe 호출 시 1L이 들어올 것을 기대함
            given(letterRepository.findRandomMemberExceptMe(senderId)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> letterService.createLetterAndDirectSendLetter(new CreateLetterReq("제목", "내용"), senderId))
                    .isInstanceOf(ServiceException.class)
                    // 실제 에러 메시지인 "배송"으로 수정하거나 공통적인 단어만 검증
                    .hasMessageContaining("배송 가능한 유저가 없습니다");
        }

        @Nested
        @DisplayName("답장 작성 테스트")
        class ReplyLetter {

            @Test
            @DisplayName("성공: 수신자가 올바른 답장을 작성한다")
            void reply_Success() {
                // given
                long letterId = 10L;
                long receiverId = 1L;
                ReplyLetterReq req = new ReplyLetterReq("정성스러운 답장");

                Member receiver = mock(Member.class);
                given(receiver.getId()).willReturn(receiverId);

                Letter letter = Letter.builder()
                        .receiver(receiver)
                        .status(LetterStatus.SENT)
                        .build();

                given(letterRepository.findById(letterId)).willReturn(Optional.of(letter));

                // when
                letterService.replyLetter(letterId, req, receiverId);

                // then
                assertThat(letter.getStatus()).isEqualTo(LetterStatus.REPLIED);
                assertThat(letter.getReplyContent()).isEqualTo("정성스러운 답장");
            }

            @Test
            @DisplayName("실패: 본인이 받은 편지가 아닌 경우 예외 발생")
            void reply_Forbidden() {
                // given
                Member realReceiver = mock(Member.class);
                given(realReceiver.getId()).willReturn(1L);

                Letter letter = Letter.builder().receiver(realReceiver).build();
                given(letterRepository.findById(10L)).willReturn(Optional.of(letter));

                // when & then
                assertThatThrownBy(() -> letterService.replyLetter(10L, new ReplyLetterReq("내용"), 999L))
                        .isInstanceOf(ServiceException.class)
                        .hasMessageContaining("본인이 받은 편지에만");
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

                // Letter 엔티티는 빌더를 통해 생성
                Letter letter = Letter.builder()
                        .title("받은 제목")
                        .status(LetterStatus.SENT)
                        .build();
                ReflectionTestUtils.setField(letter, "id", 1L);

                Page<Letter> page = new PageImpl<>(List.of(letter), pageable, 1);
                given(letterRepository.findByReceiverId(eq(memberId), any(Pageable.class))).willReturn(page);

                // when
                LetterListRes result = letterService.getMyInbox(memberId, 0, 10);

                // then
                assertThat(result.letters()).hasSize(1);
                assertThat(result.letters().get(0).title()).isEqualTo("받은 제목");
            }

            @Test
            @DisplayName("성공: 편지 상세 내용을 조회한다")
            void getLetterDetail_Success() {
                // given
                long letterId = 1L;
                long myId = 10L;

                Member sender = mock(Member.class);
                given(sender.getId()).willReturn(myId);

                Letter letter = Letter.builder()
                        .sender(sender)
                        .receiver(mock(Member.class))
                        .title("상세 제목")
                        .content("상세 내용")
                        .status(LetterStatus.SENT)
                        .build();
                ReflectionTestUtils.setField(letter, "id", letterId);

                given(letterRepository.findById(letterId)).willReturn(Optional.of(letter));

                // when
                LetterInfoRes result = letterService.getLetter(letterId, myId);

                // then
                assertThat(result.title()).isEqualTo("상세 제목");
                assertThat(result.content()).isEqualTo("상세 내용");
            }
        }
    }
}
