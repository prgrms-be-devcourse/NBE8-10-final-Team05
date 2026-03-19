package com.back.letter.service;


import com.back.global.exception.ServiceException;
import com.back.letter.dto.*;
import com.back.letter.entity.Letter;
import com.back.letter.entity.LetterStatus;
import com.back.letter.repository.LetterRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LetterService {

    private final LetterRepository letterRepository;
    private final MemberRepository memberRepository;


    /*
      [고민 편지 작성 및 즉시 랜덤 발송]
      작성자가 편지를 쓰는 순간, 시스템이 작성자를 제외한 유저 중 한 명을 골라 즉시 보냄
     */
    @Transactional
    public int createLetterAndDirectSendLetter(CreateLetterReq req, int senderId){

        // 1. 기존에 편지를 썼던 유저들(senderId 모음) 중 나를 제외한 랜덤 1인 추출
        // 만약 첫 유저라 보낼 대상이 없다면 null이 할당

        Member sender = memberRepository.findById(senderId)
                .orElseThrow(()-> new ServiceException("404-1", "사용자를 찾을 수 없습니다."));

        Member randomReceiverId = letterRepository.findRandomMemberExceptMe(sender.getId())
                .orElseThrow(()->new ServiceException("404-2", "배송 가능한 유저가 없습니다."));

        // 2. 빌더 패턴을 사용하여 편지 엔티티 생성
        // 수신자(receiverId)를 생성 시점에 바로 할당하여 배송
        Letter letter = Letter.builder()
                .title(req.title())
                .content(req.content())
                .sender(sender)
                .receiver(randomReceiverId)
                .status(LetterStatus.SENT)
                .build();

        // 3. 저장 후 생성된 편지의 고유 ID 반환
        return letterRepository.save(letter).getId();
    }


    /*
      [편지 단건 조회]
      특정 ID의 편지 내용을 확인
     */
    public LetterInfoRes getLetter(int id){
        Letter letter = letterRepository.findById(id)
                .orElseThrow(()->new ServiceException("404-1","편지를 찾을 수 없습니다."));

        return LetterInfoRes.from(letter);
    }

    /*
      [답장 작성]
      수신자가 고민 편지에 대해 답장을 남기면 상태를 REPLIED로 변경
     */
    @Transactional
    public void replyLetter(int id, ReplyLetterReq req) {
        Letter letter = letterRepository.findById(id)
                .orElseThrow(() -> new ServiceException("404-1","편지를 찾을 수 없습니다."));

        // Entity 내부의 비즈니스 로직(reply)을 호출하여 데이터 변경 및 상태 업데이트
        letter.reply(req.replyContent());
    }


    /*
     [나에게 온 편지 보관함 조회]
     내가 수신자(receiverId)로 지정된 모든 편지 목록을 최신순으로 가져옴
     */
    @Transactional(readOnly = true)
    public LetterListRes getMyInbox(Member userId) {

        // 1. 리포지토리를 통해 나에게 온 편지 엔티티 리스트 조회
        List<Letter> letters = letterRepository.findByReceiverOrderByCreateDateDesc(userId);


        // 2. 엔티티 리스트를 클라이언트 응답용 DTO(LetterItem) 리스트로 변환
        List<LetterItem> items = letters.stream()
                .map(LetterItem::from)
                .toList();


        // 3. 최종 응답 객체(LetterListRes) 생성 후 반환
        return new LetterListRes(items);
    }
}
