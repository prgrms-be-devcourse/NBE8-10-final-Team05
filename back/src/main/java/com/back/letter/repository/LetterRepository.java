package com.back.letter.repository;

import com.back.letter.entity.Letter;
import com.back.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LetterRepository extends JpaRepository<Letter, Integer> {


    List<Letter> findByReceiverOrderByCreateDateDesc(Member receiver);
    @Query(value = "SELECT * FROM members " +
            "WHERE id != :myId AND status = 'ACTIVE' " +
            "ORDER BY RANDOM() LIMIT 1",
            nativeQuery = true)
    Optional<Member> findRandomMemberExceptMe(@Param("myId") int myId);
}
