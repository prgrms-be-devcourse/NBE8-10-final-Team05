package com.back.letter.adapter.out.persistence.repository;

import com.back.letter.domain.Letter;
import com.back.member.domain.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LetterRepository extends JpaRepository<Letter, Long> {

    @Query(
            value = """
            SELECT l FROM Letter l
            JOIN FETCH l.sender s
            LEFT JOIN FETCH l.receiver r
            WHERE (
              (:onlyUnassigned = true AND l.status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NOT NULL AND l.status = :status)
            )
            """,
            countQuery = """
            SELECT count(l) FROM Letter l
            WHERE (
              (:onlyUnassigned = true AND l.status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NOT NULL AND l.status = :status)
            )
            """)
    Page<Letter> findAdminLetters(
            @Param("status") com.back.letter.domain.LetterStatus status,
            @Param("onlyUnassigned") boolean onlyUnassigned,
            Pageable pageable);

    @Query(
            value = """
            SELECT l FROM Letter l
            JOIN FETCH l.sender s
            LEFT JOIN FETCH l.receiver r
            WHERE (
              (:onlyUnassigned = true AND l.status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NOT NULL AND l.status = :status)
            )
            AND (
              :query IS NULL
              OR lower(l.title) LIKE lower(concat('%', :query, '%'))
              OR lower(l.content) LIKE lower(concat('%', :query, '%'))
              OR lower(s.nickname) LIKE lower(concat('%', :query, '%'))
              OR lower(coalesce(r.nickname, '')) LIKE lower(concat('%', :query, '%'))
            )
            """,
            countQuery = """
            SELECT count(l) FROM Letter l
            JOIN l.sender s
            LEFT JOIN l.receiver r
            WHERE (
              (:onlyUnassigned = true AND l.status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NULL)
              OR (:onlyUnassigned = false AND :status IS NOT NULL AND l.status = :status)
            )
            AND (
              :query IS NULL
              OR lower(l.title) LIKE lower(concat('%', :query, '%'))
              OR lower(l.content) LIKE lower(concat('%', :query, '%'))
              OR lower(s.nickname) LIKE lower(concat('%', :query, '%'))
              OR lower(coalesce(r.nickname, '')) LIKE lower(concat('%', :query, '%'))
            )
            """)
    Page<Letter> searchAdminLetters(
            @Param("query") String query,
            @Param("status") com.back.letter.domain.LetterStatus status,
            @Param("onlyUnassigned") boolean onlyUnassigned,
            Pageable pageable);

    @Query("SELECT l FROM Letter l JOIN FETCH l.sender LEFT JOIN FETCH l.receiver WHERE l.id = :id")
    Optional<Letter> findByIdForAdmin(@Param("id") Long id);

    @Query("SELECT l FROM Letter l JOIN FETCH l.sender WHERE l.receiver.id = :memberId")
    Page<Letter> findByReceiverId(@Param("memberId") Long memberId, Pageable pageable);

    @Query("SELECT l FROM Letter l JOIN FETCH l.receiver WHERE l.sender.id = :memberId")
    Page<Letter> findBySenderId(@Param("memberId") Long memberId, Pageable pageable);

    @Query("""
            SELECT l
            FROM Letter l
            JOIN FETCH l.sender s
            LEFT JOIN FETCH l.receiver r
            WHERE s.id = :memberId OR r.id = :memberId
            ORDER BY l.createDate DESC
            """)
    List<Letter> findRecentAdminLettersByMemberId(@Param("memberId") Long memberId, Pageable pageable);

    @Query(value = "SELECT * FROM members " +
            "WHERE id NOT IN (:excludeIds) " + // != 대신 NOT IN 사용
            "AND status = 'ACTIVE' " +
            "AND random_receive_allowed = true " +
            "ORDER BY RANDOM() LIMIT 1",
            nativeQuery = true)
    Optional<Member> findRandomMemberExceptMe(@Param("excludeIds") List<Long> excludeIds);
    Optional<Letter> findFirstByReceiverIdOrderByCreateDateDesc(Long receiverId);
    Optional<Letter> findFirstBySenderIdOrderByCreateDateDesc(Long senderId);
    long countByReceiverId(Long receiverId);
    long countByCreateDateGreaterThanEqualAndCreateDateLessThan(
            LocalDateTime startInclusive, LocalDateTime endExclusive);
    boolean existsByTitle(String title);
    long countByTitleStartingWith(String prefix);
    void deleteByTitleStartingWith(String prefix);
    @Query("SELECT l FROM Letter l WHERE l.status = 'SENT' AND l.createDate <= :expirationTime")
    List<Letter> findUnreadLettersExceeding(@Param("expirationTime") LocalDateTime expirationTime);


}
