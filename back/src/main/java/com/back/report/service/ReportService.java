package com.back.report.service;

import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.diary.adapter.out.persistence.repository.DiaryRepository;
import com.back.global.exception.ServiceException;
import com.back.notification.application.service.NotificationService;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.letter.domain.Letter;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import com.back.post.entity.Post;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import com.back.report.dto.*;
import com.back.report.entity.Report;
import com.back.report.entity.ReportStatus;
import com.back.report.entity.TargetType;
import com.back.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final MemberRepository memberRepository;
    private final PostRepository postRepository;
    private final LetterRepository letterRepository;
    private final DiaryRepository diaryRepository;
    private final CommentRepository commentRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    @Transactional
    public Long createReport(Long reporterId, ReportCreateRequest request) {
        // 중복 신고 방지
        if (reportRepository.existsByReporterIdAndTargetIdAndTargetType(
                reporterId, request.targetId(), request.targetType())) {
            throw new ServiceException("400-1", "이미 신고한 콘텐츠입니다.");
        }

        Report report = Report.create(
                reporterId,
                request.targetId(),
                request.targetType(),
                request.reason(),
                request.content()
        );

        return reportRepository.save(report).getId();
    }

    // 관리자용 신고 목록 조회
    public List<ReportListResponse> getReports() {
        return reportRepository.findAll().stream()
                .map(report -> {
                    Member reporter = memberRepository.findById(report.getReporterId()).orElse(null);
                    return new ReportListResponse(
                            report.getId(),
                            reporter != null ? reporter.getNickname() : "알 수 없음",
                            report.getTargetType().name(),
                            report.getTargetId(),
                            report.getReason().getContent(),
                            report.getStatus().name(),
                            report.getCreateDate()
                    );
                }).toList();
    }

    public AdminDashboardStatsResponse getDashboardStats() {
        LocalDate today = LocalDate.now(clock);
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        return new AdminDashboardStatsResponse(
                reportRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(startOfDay, endOfDay),
                reportRepository.countByStatus(ReportStatus.RECEIVED),
                reportRepository.countByStatus(ReportStatus.PROCESSED),
                letterRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(startOfDay, endOfDay),
                diaryRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(startOfDay, endOfDay),
                memberRepository.countByStatusAndRoleAndRandomReceiveAllowed(
                        MemberStatus.ACTIVE, MemberRole.USER, true)
        );
    }

    // 관리자용 신고 상세 조회
    public ReportDetailResponse getReportDetail(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 신고입니다."));

        Member reporter = memberRepository.findById(report.getReporterId()).orElse(null);

        String originalContent = "";
        String authorNickname = "";

        // 타겟 타입에 따른 원본 데이터 조회
        if (report.getTargetType() == TargetType.POST) {
            Post post = postRepository.findById(report.getTargetId()).orElse(null);
            if (post != null) {
                originalContent = post.getContent();
                authorNickname = post.getMember().getNickname();
            }
        } else if (report.getTargetType() == TargetType.LETTER) {
            Letter letter = letterRepository.findById(report.getTargetId()).orElse(null);
            if (letter != null) {
                originalContent = letter.getContent();
                authorNickname = letter.getSender().getNickname();
            }
        }else if (report.getTargetType() == TargetType.COMMENT) {
            Comment comment = commentRepository.findById(report.getTargetId()).orElse(null);
            if (comment != null) {
                originalContent = comment.getContent();
                authorNickname = comment.getAuthor().getNickname();
            }
        }

        return new ReportDetailResponse(
                report.getId(),
                reporter != null ? reporter.getNickname() : "알 수 없음",
                report.getReason().getContent(),
                report.getContent(),
                report.getStatus().name(),
                report.getProcessingAction(),
                report.getCreateDate(),
                new ReportDetailResponse.TargetInfo(
                        report.getTargetType().name(),
                        report.getTargetId(),
                        originalContent,
                        authorNickname
                )
        );
    }

    // 관리자용 신고 처리 로직
    @Transactional
    public void handleReport(Long id, ReportHandleRequest request) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 신고입니다."));

        Long reportedUserId = findAuthorIdByTarget(report.getTargetType(), report.getTargetId());

        // 1. 신고 사유가 부적절한 경우 (무시)
        if ("REJECT".equals(request.action())) {
            // 별도 조치 없이 상태만 변경하러 이동
        }

        // 게시글/댓글 삭제
        else if ("DELETE".equals(request.action())) {
            if (report.getTargetType() == TargetType.POST) {
                postRepository.findById(report.getTargetId())
                        .ifPresent(post -> post.updateStatus(PostStatus.HIDDEN));
            }
            else if (report.getTargetType() == TargetType.COMMENT) {
                commentRepository.findById(report.getTargetId())
                        .ifPresent(Comment::markAsDelete);
            }
        }
        // 작성자 계정 정지 (POST, LETTER, COMMENT)
        else if ("BLOCK_USER".equals(request.action())) {
            if (reportedUserId != null) {
                memberRepository.findById(reportedUserId)
                        .ifPresent(member -> member.updateStatus(MemberStatus.BLOCKED));
            }
        }
        report.markAsProcessed(request.action());

        // 피신고자에게 알림 전송 (반려 제외)
        if (reportedUserId != null && !"REJECT".equals(request.action())) {
            String msg = "계정이 정지되었습니다.";
            if ("DELETE".equals(request.action())) {
                msg = (report.getTargetType() == TargetType.COMMENT) ? "댓글이 삭제되었습니다." : "게시물이 삭제되었습니다.";
            }
            // 알림 메시지가 요청에 포함되어 있다면 그것을 우선 사용
            if (request.notificationMessage() != null && !request.notificationMessage().isBlank()) {
                msg = request.notificationMessage();
            }
            notificationService.send(reportedUserId, "REPORT_RESULT", msg);
        }

        reportRepository.findAllByTargetTypeAndTargetIdAndStatus(
                report.getTargetType(),
                report.getTargetId(),
                ReportStatus.RECEIVED
        ).forEach(r -> r.markAsProcessed("중복 신고 건: 관리자에 의해 일괄 처리됨"));

    }

    //타겟의 작성자 ID를 추출
    private Long findAuthorIdByTarget(TargetType type, Long targetId) {
        if (type == TargetType.POST) {
            return postRepository.findById(targetId)
                    .map(p -> p.getMember().getId())
                    .orElse(null);
        } else if (type == TargetType.LETTER) {
            return letterRepository.findById(targetId)
                    .map(l -> l.getSender().getId())
                    .orElse(null);
        } else if (type == TargetType.COMMENT) {
            return commentRepository.findById(targetId)
                    .map(c -> c.getAuthor().getId())
                    .orElse(null);
        }
        return null;
    }

}
