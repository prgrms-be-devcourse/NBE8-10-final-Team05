package com.back.letter.service;


import com.back.ai.dto.AuditAiRequest;
import com.back.ai.service.AiService;
import com.back.global.exception.ServiceException;
import com.back.letter.dto.*;
import com.back.letter.entity.Letter;
import com.back.letter.entity.LetterStatus;
import com.back.letter.repository.LetterRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LetterService {

    private final LetterRepository letterRepository;
    private final MemberRepository memberRepository;
    private final AiService aiService;


    private void auditContent(String content, String type) {
        // AiService 호출
        var auditResponse = aiService.auditContent(new AuditAiRequest(content, type));

        if (!auditResponse.isPassed()) {
            // 통과 실패 시 AI가 제안한 부드러운 거절 메시지를 담아 예외 발생
            // 에러 코드는 임의로 "400-AI"로 지정 (필요시 Enum으로 교체)
            throw new ServiceException("400-AI", auditResponse.message());
        }
    }


    /*
      [고민 편지 작성 및 즉시 랜덤 발송]
      작성자가 편지를 쓰는 순간, 시스템이 작성자를 제외한 유저 중 한 명을 골라 즉시 보냄
     */
    @Transactional
    public int createLetterAndDirectSendLetter(CreateLetterReq req, int senderId){

        String fullContent = String.format("[제목] %s [내용] %s", req.title(), req.content());
        auditContent(fullContent, "Letter");

        Member sender = memberRepository.findById(senderId)
                .orElseThrow(()-> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));

        Member randomReceiverId = letterRepository.findRandomMemberExceptMe(sender.getId())
                .orElseThrow(()->new ServiceException("404-2", "배송 가능한 유저가 없습니다."));

        Letter letter = Letter.builder()
                .title(req.title())
                .content(req.content())
                .sender(sender)
                .receiver(randomReceiverId)
                .status(LetterStatus.SENT)
                .build();

        System.out.println("==== 편지 발송 확인 ====");
        System.out.println("발신자 ID: " + senderId);
        System.out.println("수신자 ID: " + randomReceiverId.getId());
        System.out.println("========================");

        // 3. 저장 후 생성된 편지의 고유 ID 반환
        return letterRepository.save(letter).getId();
    }


    /*
      [편지 단건 조회]
      특정 ID의 편지 내용을 확인
     */
    public LetterInfoRes getLetter(int id, int accessorId){
        Letter letter = letterRepository.findById(id)
                .orElseThrow(()->new ServiceException("404-1","편지를 찾을 수 없습니다."));

        if(letter.getSender().getId() != accessorId && letter.getReceiver().getId() != accessorId) {
            throw new ServiceException("403-1", "이 편지를 볼 권한이 없습니다.");
        }

        return LetterInfoRes.from(letter);
    }

    /*
      [답장 작성]
      수신자가 고민 편지에 대해 답장을 남기면 상태를 REPLIED로 변경
     */
    @Transactional
    public void replyLetter(int id, ReplyLetterReq req, int accessorId) {

        auditContent(req.replyContent(), "Reply");

        Letter letter = letterRepository.findById(id)
                .orElseThrow(() -> new ServiceException("404-1","편지를 찾을 수 없습니다."));

        if(letter.getReceiver().getId() != accessorId){
            throw new ServiceException("403-2", "본인이 받은 편지에만 답장할 수 있습니다.");
        }
        if(letter.getStatus() == LetterStatus.REPLIED){
            throw new ServiceException("400-2", "이미 답장한 편지입니다.");
        }
        // Entity 내부의 비즈니스 로직(reply)을 호출하여 데이터 변경 및 상태 업데이트
        letter.reply(req.replyContent());
    }

    // 나에게 온 편지 보관함 조회
    public LetterListRes getMyInbox(int memberId, int page, int size) {
        return getLetterList(page, size, letterRepository.findByReceiverId(memberId, getPageable(page, size)));
    }

    // 내가 보낸 편지 보관함 조회
    public LetterListRes getMySentBox(int memberId, int page, int size) {
        return getLetterList(page, size, letterRepository.findBySenderId(memberId, getPageable(page, size)));
    }

    // 공통 정렬 로직 추출
    private Pageable getPageable(int page, int size) {
        return PageRequest.of(page, size, Sort.by("id").descending());
    }

    // 공통 변환 로직 추출
    private LetterListRes getLetterList(int page, int size, Page<Letter> letterPage) {
        return LetterListRes.from(letterPage.map(LetterItem::from));
    }
}
