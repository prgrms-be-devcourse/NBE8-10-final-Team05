package com.back.report.adapter.out.persistence;

import com.back.report.domain.Report;
import com.back.report.domain.ReportStatus;
import com.back.report.domain.TargetType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    boolean existsByReporterIdAndTargetIdAndTargetType(Long reporterId, Long targetId, TargetType targetType);
    List<Report> findAllByTargetTypeAndTargetIdAndStatus(TargetType targetType, Long targetId, ReportStatus status);
    long countByStatus(ReportStatus status);
    long countByContentStartingWith(String prefix);
    long countByCreateDateGreaterThanEqualAndCreateDateLessThan(
            LocalDateTime startInclusive, LocalDateTime endExclusive);
    void deleteByContentStartingWith(String prefix);

    List<Report> findByReporterIdOrderByCreateDateDesc(Long reporterId, Pageable pageable);

    @Query("""
            SELECT r
            FROM Report r
            WHERE r.targetType = com.back.report.domain.TargetType.POST
              AND EXISTS (
                SELECT 1
                FROM Post p
                WHERE p.id = r.targetId
                  AND p.member.id = :memberId
              )
            ORDER BY r.createDate DESC
            """)
    List<Report> findPostTargetReportsByAuthorId(@Param("memberId") Long memberId, Pageable pageable);

    @Query("""
            SELECT r
            FROM Report r
            WHERE r.targetType = com.back.report.domain.TargetType.LETTER
              AND EXISTS (
                SELECT 1
                FROM Letter l
                WHERE l.id = r.targetId
                  AND l.sender.id = :memberId
              )
            ORDER BY r.createDate DESC
            """)
    List<Report> findLetterTargetReportsBySenderId(@Param("memberId") Long memberId, Pageable pageable);

    @Query("""
            SELECT r
            FROM Report r
            WHERE r.targetType = com.back.report.domain.TargetType.COMMENT
              AND EXISTS (
                SELECT 1
                FROM Comment c
                WHERE c.id = r.targetId
                  AND c.author.id = :memberId
              )
            ORDER BY r.createDate DESC
            """)
    List<Report> findCommentTargetReportsByAuthorId(@Param("memberId") Long memberId, Pageable pageable);
}
