package com.back.letter.application.port.out;

import com.back.letter.domain.Letter;
import com.back.member.domain.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface LetterPort {
    Letter save(Letter letter);
    Optional<Letter> findById(long id);
    Page<Letter> findByReceiverId(long memberId, Pageable pageable);
    Page<Letter> findBySenderId(long memberId, Pageable pageable);
    Optional<Member> findRandomMemberExceptMe(long myId);
    Optional<Letter> findLatestReceived(Long receiverId);

    Optional<Letter> findLatestSent(Long senderId);

    long countByReceiverId(Long receiverId);
}
