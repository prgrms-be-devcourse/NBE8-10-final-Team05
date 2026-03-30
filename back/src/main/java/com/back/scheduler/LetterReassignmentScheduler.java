package com.back.scheduler;

import com.back.letter.application.port.in.SendLetterUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// back 패키지 하위에 scheduler 패키지 생성 권장
@Component
@RequiredArgsConstructor
public class LetterReassignmentScheduler {

    private final SendLetterUseCase sendLetterUseCase;

////     매 30분마다 실행하여 12시간 지난 편지 체크
    @Scheduled(cron = "0 0/30 * * * *")
    public void run() {
        System.out.println("==> 미수신 편지 재매칭 스케줄러 시작");
        sendLetterUseCase.reassignUnreadLetters();
        System.out.println("==> 미수신 편지 재매칭 스케줄러 종료");
    }

//    @Scheduled(cron = "0 * * * * *")
//    public void run() {
//        System.out.println("==> 미수신 편지 재매칭 스케줄러 시작");
//        sendLetterUseCase.reassignUnreadLetters();
//        System.out.println("==> 미수신 편지 재매칭 스케줄러 종료");
//    }
}
