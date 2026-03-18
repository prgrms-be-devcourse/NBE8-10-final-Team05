package com.back.global.initData;

import com.back.domain.letter.entity.Letter;
import com.back.domain.letter.repository.LetterRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class BaseInitData {
    @Bean
    public ApplicationRunner init(LetterRepository letterRepository) {
        return args -> {
            if (letterRepository.count() > 0) return;

            letterRepository.save(Letter.builder()
                    .title("취업 준비가 너무 힘들어요")
                    .content("벌써 50번째 탈락이네요. 저만 뒤처지는 기분이에요.")
                    .senderId("user_alpha")
                    .receiverId(null)
                    .status("SENT")
                    .build());

            letterRepository.save(Letter.builder()
                    .title("짝사랑 고민입니다")
                    .content("친한 친구를 좋아하게 됐는데 고백하면 멀어질까 봐 무서워요.")
                    .senderId("user_beta")
                    .receiverId(null)
                    .status("SENT")
                    .build());

            letterRepository.save(Letter.builder()
                    .title("인간관계 회의감")
                    .content("믿었던 친구에게 실망했어요. 다들 겉으로만 친한 척하는 걸까요?")
                    .senderId("user_gamma")
                    .receiverId("user_test")
                    .status("SENT")
                    .build());

            letterRepository.save(Letter.builder()
                    .title("오늘 날씨가 좋네요")
                    .content("기분 전환 겸 산책 다녀왔는데 힐링 되네요!")
                    .senderId("user_delta")
                    .receiverId("user_epsilon")
                    .replyContent("우와, 저도 산책 가고 싶어지네요!")
                    .status("REPLIED")
                    .build());
        };
    }
}
