package com.back.letter.application.port.out;

import com.back.letter.domain.Letter;
import com.back.member.domain.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LetterPort {
    Letter save(Letter letter);
    Optional<Letter> findById(long id);
    Page<Letter> findByReceiverId(long memberId, Pageable pageable);
    Page<Letter> findBySenderId(long memberId, Pageable pageable);
    Optional<Member> findRandomMemberExceptMe(List<Long> excludeIds);
    Optional<Letter> findLatestReceived(Long receiverId);

    Optional<Letter> findLatestSent(Long senderId);
    List<Letter> findUnreadLettersExceeding(LocalDateTime expirationTime);
    long countByReceiverId(Long receiverId);
}
