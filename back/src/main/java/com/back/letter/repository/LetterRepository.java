package com.back.letter.repository;

import com.back.letter.entity.Letter;
import com.back.member.domain.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LetterRepository extends JpaRepository<Letter, Integer> {

    @Query("SELECT l FROM Letter l JOIN FETCH l.sender WHERE l.receiver.id = :memberId")
    Page<Letter> findByReceiverId(@Param("memberId") Integer memberId, Pageable pageable);

    @Query("SELECT l FROM Letter l JOIN FETCH l.receiver WHERE l.sender.id = :memberId")
    Page<Letter> findBySenderId(@Param("memberId") Integer memberId, Pageable pageable);

    @Query(value = "SELECT * FROM members " +
            "WHERE id != :myId AND status = 'ACTIVE' " +
            "ORDER BY RANDOM() LIMIT 1",
            nativeQuery = true)
    Optional<Member> findRandomMemberExceptMe(@Param("myId") int myId);
}
