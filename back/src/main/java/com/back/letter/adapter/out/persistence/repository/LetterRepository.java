package com.back.letter.adapter.out.persistence.repository;

import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LetterRepository extends JpaRepository<Letter, Long> {

    @Query("SELECT l FROM Letter l JOIN FETCH l.sender WHERE l.receiver.id = :memberId")
    Page<Letter> findByReceiverId(@Param("memberId") Long memberId, Pageable pageable);

    @Query("SELECT l FROM Letter l JOIN FETCH l.receiver WHERE l.sender.id = :memberId")
    Page<Letter> findBySenderId(@Param("memberId") Long memberId, Pageable pageable);

    @Query(value = "SELECT * FROM members " +
            "WHERE id != :myId " +
            "AND status = 'ACTIVE' " +
            "AND random_receive_allowed = true " +
            "ORDER BY RANDOM() LIMIT 1", // RAND()를 RANDOM()으로 변경
            nativeQuery = true)
    Optional<Member> findRandomMemberExceptMe(@Param("myId") long myId);
    Optional<Letter> findFirstByReceiverIdOrderByCreateDateDesc(Long receiverId);
    Optional<Letter> findFirstBySenderIdOrderByCreateDateDesc(Long senderId);
    long countByReceiverId(Long receiverId);
    boolean existsByTitle(String title);
}
