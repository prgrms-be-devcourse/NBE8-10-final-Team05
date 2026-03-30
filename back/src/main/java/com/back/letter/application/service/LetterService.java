package com.back.letter.application.service;

import com.back.ai.adapter.in.web.dto.AuditAiRequest;
import com.back.ai.application.service.AiService;
import com.back.global.exception.ServiceException;
import com.back.letter.application.port.in.*;
import com.back.letter.application.port.in.dto.*; // DTO 패키지 경로 주의
import com.back.letter.application.port.out.LetterNotificationPort;
import com.back.letter.application.port.out.LetterPort;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LetterService implements SendLetterUseCase, InquiryLetterUseCase {

    private final LetterPort letterPort;
    private final MemberRepository memberRepository;
    private final AiService aiService;
    private final LetterNotificationPort notificationPort;


    /**
     * [AI 검수 로직]
     */
    private void auditContent(String content, String type) {
        var auditResponse = aiService.auditContent(new AuditAiRequest(content, type));

        if (!auditResponse.isPassed()) {
            throw new ServiceException("400-AI", auditResponse.message());
        }
    }

    /**
     * [고민 편지 작성 및 즉시 랜덤 발송]
     */
    @Override
    @Transactional
    public long createLetterAndDirectSendLetter(CreateLetterReq req, long senderId) {
        // 1. AI 검수
        String fullContent = String.format("[제목] %s [내용] %s", req.title(), req.content());
        auditContent(fullContent, "Letter");

        // 2. 발신자 조회
        Member sender = memberRepository.findById(senderId)
                .orElseThrow(() -> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));

        // 3. 랜덤 수신자 매칭 (수신 수락한 유저가 없을 경우 예외 처리)
        Member receiver = letterPort.findRandomMemberExceptMe(sender.getId())
                .orElseThrow(() -> new ServiceException("404-2",
                        "편지를 받을 수 있는 유저가 없습니다."));

        // 4. 편지 생성 및 저장
        Letter letter = Letter.builder()
                .title(req.title())
                .content(req.content())
                .sender(sender)
                .receiver(receiver)
                .status(LetterStatus.SENT)
                .build();



        Letter saved = letterPort.save(letter);
        notificationPort.sendNotification(
                receiver.getId(), // 수신자 ID
                "new_letter",
                "새로운 랜덤 편지가 도착했습니다!"
        );

        System.out.println("=== 편지 발송 ===");
        System.out.println("letterId: " + saved.getId());
        System.out.println("발신자: id=" + sender.getId() + " email=" + sender.getEmail());
        System.out.println("수신자: id=" + receiver.getId() + " email=" + receiver.getEmail());
        System.out.println("=================");

        return saved.getId();

        // 5. Port를 통해 저장 후 ID 반환
//        return letterPort.save(letter).getId();
    }

    /**
     * [편지 단건 조회]
     */
    @Override
    public LetterInfoRes getLetter(long id, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        if (!letter.getSender().getId().equals(accessorId) && !letter.getReceiver().getId().equals(accessorId)) {
            throw new ServiceException("403-1", "이 편지를 볼 권한이 없습니다.");
        }

        return LetterInfoRes.from(letter);
    }

    /**
     * [답장 작성]
     */
    @Override
    @Transactional
    public void replyLetter(long id, ReplyLetterReq req, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        if (!letter.getReceiver().getId().equals(accessorId)) {
            throw new ServiceException("403-2", "본인이 받은 편지에만 답장할 수 있습니다.");
        }

        auditContent(req.replyContent(), "Reply");
        letter.reply(req.replyContent());

        notificationPort.sendNotification(
                letter.getSender().getId(),
                "reply_arrival",
                "보낸 편지에 답장이 도착했습니다!"
        );
    }

    /**
     * [보관함 조회 로직들]
     */
    @Override
    public LetterListRes getMyInbox(long memberId, int page, int size) {
        Page<Letter> letterPage = letterPort.findByReceiverId(memberId, getPageable(page, size));
        return getLetterList(letterPage);
    }

    @Override
    public LettersStatsRes getMailboxStats(long memberId) {
        long receivedCount = letterPort.countByReceiverId(memberId);

        LettersStatsRes.LetterSummary latestReceived = letterPort.findLatestReceived(memberId)
                .map(l -> LettersStatsRes.LetterSummary.builder()
                        .id(l.getId())
                        .title(l.getTitle())
                        .createdDate(l.getCreateDate().toString())
                        .replied(l.getStatus() == LetterStatus.REPLIED)
                        .build())
                .orElse(null);

        LettersStatsRes.LetterSummary latestSent = letterPort.findLatestSent(memberId)
                .map(l -> LettersStatsRes.LetterSummary.builder()
                        .id(l.getId())
                        .title(l.getTitle())
                        .createdDate(l.getCreateDate().toString())
                        .build())
                .orElse(null);

        return LettersStatsRes.builder()
                .receivedCount(receivedCount)
                .latestReceivedLetter(latestReceived)
                .latestSentLetter(latestSent)
                .build();
    }

    @Override
    public LetterListRes getMySentBox(long memberId, int page, int size) {
        Page<Letter> letterPage = letterPort.findBySenderId(memberId, getPageable(page, size));
        return getLetterList(letterPage);
    }

    private Pageable getPageable(int page, int size) {
        return PageRequest.of(page, size, Sort.by("id").descending());
    }

    private LetterListRes getLetterList(Page<Letter> letterPage) {
        return LetterListRes.from(letterPage.map(LetterItem::from));
    }

    @Override
    @Transactional
    public void acceptLetter(long id, long accessorId) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        if (letter.getStatus() == LetterStatus.SENT) {
            letter.setStatus(LetterStatus.ACCEPTED);
        }

        notificationPort.sendNotification(
                letter.getSender().getId(),
                "new_letter",
                "상대방이 당신의 편지를 읽었습니다."
        );
    }

    @Override
    @Transactional
    public void updateWritingStatus(long id) {
        Letter letter = letterPort.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "편지를 찾을 수 없습니다."));

        if (letter.getStatus() != LetterStatus.REPLIED) {
            letter.setStatus(LetterStatus.WRITING);
        }

        // [추가] 발신자에게 답장 작성 중임을 실시간 알림
        notificationPort.sendNotification(
                letter.getSender().getId(),
                "new_letter",
                "상대방이 답장을 작성하고 있습니다."
        );
    }

    @Override
    public String getLiveStatus(long id) {
        return letterPort.findById(id)
                .map(letter -> letter.getStatus().name())
                .orElse("NOT_FOUND");
    }


}
