package com.back.report.service;

import com.back.global.exception.ServiceException;
import com.back.notification.application.service.NotificationService;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import com.back.post.entity.Post;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import com.back.report.dto.ReportCreateRequest;
import com.back.report.dto.ReportDetailResponse;
import com.back.report.dto.ReportHandleRequest;
import com.back.report.dto.ReportListResponse;
import com.back.report.entity.Report;
import com.back.report.entity.ReportReason;
import com.back.report.entity.ReportStatus;
import com.back.report.entity.TargetType;
import com.back.report.repository.ReportRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private LetterRepository letterRepository;
    @Mock
    private NotificationService notificationService;
    @InjectMocks
    private ReportService reportService;

    @Test
    @DisplayName("신고가 정상적으로 접수된다.")
    void createReport_success() {
        Long reporterId = 1L;

        ReportCreateRequest request = new ReportCreateRequest(10L, TargetType.POST, ReportReason.PROFANITY, "욕설 신고");
        
        given(reportRepository.existsByReporterIdAndTargetIdAndTargetType(any(), any(), any())).willReturn(false);

        Report savedReport = Report.builder().build();

        ReflectionTestUtils.setField(savedReport, "id", 1L);

        given(reportRepository.save(any(Report.class))).willReturn(savedReport);


        Long resultId = reportService.createReport(reporterId, request);


        assertThat(resultId).isEqualTo(1L);
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    @DisplayName("이미 신고한 콘텐츠라면 ServiceException(400-1)이 발생한다.")
    void createReport_fail_duplicate() {

        Long reporterId = 1L;
        ReportCreateRequest request = new ReportCreateRequest(10L, TargetType.POST, ReportReason.PROFANITY, "욕설 신고");
        
        given(reportRepository.existsByReporterIdAndTargetIdAndTargetType(reporterId, 10L, TargetType.POST))
                .willReturn(true);

        assertThatThrownBy(() -> reportService.createReport(reporterId, request))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("400-1");
    }

    // --- 관리자용 기능 테스트 ---

    @Test
    @DisplayName("신고 목록을 전체 조회할 수 있다.")
    void getReports_success() {
        // given
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.PROFANITY, "신고내용");
        given(reportRepository.findAll()).willReturn(List.of(report));

        // when
        List<ReportListResponse> result = reportService.getReports();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).targetId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("게시글 신고 상세 정보를 조회하면 타겟 정보와 작성자 닉네임이 포함된다.")
    void getReportDetail_post_success() {
        // given
        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.PROFANITY, "신고내용");
        ReflectionTestUtils.setField(report, "id", reportId);

        Member author = Member.create("author@test.com", "pw", "작성자");
        Post post = Post.builder().title("제목").content("원본내용").member(author).build();

        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(10L)).willReturn(Optional.of(post));

        // when
        ReportDetailResponse detail = reportService.getReportDetail(reportId);

        // then
        assertThat(detail.targetInfo().originalContent()).isEqualTo("원본내용");
        assertThat(detail.targetInfo().authorNickname()).isEqualTo("작성자");
    }

    @Test
    @DisplayName("신고 처리 - 부적절한 신고 무시(REJECT) 시 타겟 변경 없이 상태만 완료된다.")
    void handleReport_reject() {
        // given
        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.OTHER, "내용");
        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));

        ReportHandleRequest request = new ReportHandleRequest("REJECT", "사유없음", false, "");

        // when
        reportService.handleReport(reportId, request);

        // then
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
    }

    @Test
    @DisplayName("신고 처리 - 게시글 삭제(DELETE) 시 게시글 상태가 HIDDEN으로 변경된다.")
    void handleReport_delete_post() {
        // given
        Long reportId = 1L;
        Long postId = 10L;

        Member author = Member.create("test@test.com", "pw", "작성자");
        ReflectionTestUtils.setField(author, "id", 100L);

        Report report = Report.create(1L, postId, TargetType.POST, ReportReason.PROFANITY, "욕설");
        Post post = Post.builder().
                status(PostStatus.PUBLISHED)
                .member(author)
                .build();

        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(postId)).willReturn(Optional.of(post));

        ReportHandleRequest request = new ReportHandleRequest("DELETE", "게시글 삭제", false, "");

        // when
        reportService.handleReport(reportId, request);

        // then
        assertThat(post.getStatus()).isEqualTo(PostStatus.HIDDEN);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
    }

    @Test
    @DisplayName("신고 처리 - 작성자 정지(BLOCK_USER) 시 해당 유저의 상태가 BLOCKED로 변경된다.")
    void handleReport_block_user() {
        // given
        Long reportId = 1L;
        Long postId = 10L;
        Member author = Member.create("test@test.com", "hash", "나쁜유저");
        ReflectionTestUtils.setField(author, "id", 100L);
        Post post = Post.builder().member(author).build();
        Report report = Report.create(1L, postId, TargetType.POST, ReportReason.SPAM, "광고");

        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(postId)).willReturn(Optional.of(post));
        given(memberRepository.findById(100L)).willReturn(Optional.of(author));

        ReportHandleRequest request = new ReportHandleRequest("BLOCK_USER", "유저 정지", false, "");

        // when
        reportService.handleReport(reportId, request);

        // then
        assertThat(author.getStatus()).isEqualTo(MemberStatus.BLOCKED);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
    }
    @Test
    @DisplayName("게시글 신고 상세 조회 시 조치 이력(processingAction)이 포함된다.")
    void getReportDetail_success_with_action() {
        // given
        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.PROFANITY, "신고내용");
        ReflectionTestUtils.setField(report, "id", reportId);
        ReflectionTestUtils.setField(report, "processingAction", "DELETE"); // 이력 설정

        Post post = Post.builder().content("내용").member(Member.create("a@a.com", "p", "작성자")).build();

        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(10L)).willReturn(Optional.of(post));

        // when
        ReportDetailResponse detail = reportService.getReportDetail(reportId);

        // then
        assertThat(detail.processingAction()).isEqualTo("DELETE");
    }

    @Test
    @DisplayName("신고 처리 - 게시글 삭제(DELETE) 시 상태 변경과 함께 실시간 알림이 발송된다.")
    void handleReport_delete_post_with_sse() {
        // given
        Long reportId = 1L;
        Long postId = 10L;
        Long authorId = 100L;

        Member author = Member.create("test@test.com", "pw", "작성자");
        ReflectionTestUtils.setField(author, "id", authorId);

        Post post = Post.builder().status(PostStatus.PUBLISHED).member(author).build();
        Report report = Report.create(1L, postId, TargetType.POST, ReportReason.PROFANITY, "욕설");

        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(postId)).willReturn(Optional.of(post));

        ReportHandleRequest request = new ReportHandleRequest("DELETE", "삭제", false, "");

        // when
        reportService.handleReport(reportId, request);

        // then
        assertThat(post.getStatus()).isEqualTo(PostStatus.HIDDEN);
        assertThat(report.getProcessingAction()).isEqualTo("DELETE");

        // SSE 알림이 피신고자(authorId)에게 발송되었는지 검증
        verify(notificationService).send(eq(authorId), eq("REPORT_RESULT"), contains("삭제"));
    }

    @Test
    @DisplayName("신고 처리 - 유저 정지(BLOCK_USER) 시 유저 상태 변경과 함께 실시간 알림이 발송된다.")
    void handleReport_block_user_with_sse() {
        // given
        Long reportId = 1L;
        Long authorId = 100L;
        Member author = Member.create("test@test.com", "hash", "나쁜유저");
        ReflectionTestUtils.setField(author, "id", authorId);

        Post post = Post.builder().member(author).build();
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.SPAM, "광고");

        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(10L)).willReturn(Optional.of(post));
        given(memberRepository.findById(authorId)).willReturn(Optional.of(author));

        ReportHandleRequest request = new ReportHandleRequest("BLOCK_USER", "정지", false, "");

        // when
        reportService.handleReport(reportId, request);

        // then
        assertThat(author.getStatus()).isEqualTo(MemberStatus.BLOCKED);

        // SSE 알림 발송 검증
        verify(notificationService).send(eq(authorId), eq("REPORT_RESULT"), contains("정지"));
    }

    @Test
    @DisplayName("신고 처리 - 반려(REJECT) 시 알림이 발송되지 않아야 한다.")
    void handleReport_reject_no_sse() {
        // given
        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.OTHER, "내용");
        given(reportRepository.findById(reportId)).willReturn(Optional.of(report));

        ReportHandleRequest request = new ReportHandleRequest("REJECT", "반려", false, "");

        // when
        reportService.handleReport(reportId, request);

        // then
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
        // 알림 서비스가 호출되지 않았음을 검증
        verify(notificationService, never()).send(anyLong(), anyString(), anyString());
    }

}