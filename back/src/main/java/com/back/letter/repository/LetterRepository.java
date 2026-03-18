package com.back.letter.repository;

import com.back.letter.entity.Letter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LetterRepository extends JpaRepository<Letter, Integer> {


    List<Letter> findByReceiverIdOrderByCreateDateDesc(String receiverId);
    @Query(value = "SELECT sender_id FROM letter " +
            "WHERE sender_id != :me " +
            "GROUP BY sender_id " +
            "ORDER BY RANDOM() LIMIT 1",
            nativeQuery = true)
    Optional<String> findRandomUserExceptMe(@Param("me") String myId);
}
