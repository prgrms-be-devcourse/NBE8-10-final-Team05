package com.back.report.service;

import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.diary.adapter.out.persistence.repository.DiaryRepository;
import com.back.global.exception.ServiceException;
import com.back.letter.domain.Letter;
import com.back.notification.application.service.NotificationService;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberStatus;
import com.back.post.entity.Post;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import com.back.report.adapter.in.web.dto.AdminDashboardStatsResponse;
import com.back.report.adapter.in.web.dto.ReportCreateRequest;
import com.back.report.adapter.in.web.dto.ReportDetailResponse;
import com.back.report.adapter.in.web.dto.ReportHandleRequest;
import com.back.report.adapter.in.web.dto.ReportListResponse;
import com.back.report.application.port.out.ReportPersistencePort;
import com.back.report.application.service.ReportService;
import com.back.report.domain.Report;
import com.back.report.domain.ReportReason;
import com.back.report.domain.ReportStatus;
import com.back.report.domain.TargetType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
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
    private ReportPersistencePort reportPersistencePort;
    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private LetterRepository letterRepository;
    @Mock
    private DiaryRepository diaryRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private Clock clock;
    @InjectMocks
    private ReportService reportService;

    @Test
    @DisplayName("신고가 정상적으로 접수된다.")
    void createReport_success() {
        Long reporterId = 1L;

        ReportCreateRequest request = new ReportCreateRequest(10L, TargetType.POST, ReportReason.PROFANITY, "욕설 신고");
        
        given(reportPersistencePort.existsByReporterIdAndTargetIdAndTargetType(any(), any(), any())).willReturn(false);

        Report savedReport = Report.builder().build();

        ReflectionTestUtils.setField(savedReport, "id", 1L);

        given(reportPersistencePort.save(any(Report.class))).willReturn(savedReport);


        Long resultId = reportService.createReport(reporterId, request);


        assertThat(resultId).isEqualTo(1L);
        verify(reportPersistencePort).save(any(Report.class));
    }

    @Test
    @DisplayName("이미 신고한 콘텐츠라면 ServiceException(400-1)이 발생한다.")
    void createReport_fail_duplicate() {

        Long reporterId = 1L;
        ReportCreateRequest request = new ReportCreateRequest(10L, TargetType.POST, ReportReason.PROFANITY, "욕설 신고");
        
        given(reportPersistencePort.existsByReporterIdAndTargetIdAndTargetType(reporterId, 10L, TargetType.POST))
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
        given(reportPersistencePort.findAll()).willReturn(List.of(report));

        // when
        List<ReportListResponse> result = reportService.getReports();

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).targetId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("관리자 대시보드 통계는 신고, 편지, 일기, 수신 허용 회원 수를 함께 반환한다.")
    void getDashboardStats_success() {
        given(clock.getZone()).willReturn(ZoneId.of("Asia/Seoul"));
        given(clock.instant()).willReturn(Instant.parse("2026-03-30T01:00:00Z"));
        given(reportPersistencePort.countByCreateDateGreaterThanEqualAndCreateDateLessThan(any(), any()))
                .willReturn(4L);
        given(reportPersistencePort.countByStatus(ReportStatus.RECEIVED)).willReturn(7L);
        given(reportPersistencePort.countByStatus(ReportStatus.PROCESSED)).willReturn(13L);
        given(letterRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(any(), any()))
                .willReturn(5L);
        given(diaryRepository.countByCreateDateGreaterThanEqualAndCreateDateLessThan(any(), any()))
                .willReturn(3L);
        given(memberRepository.countByStatusAndRoleAndRandomReceiveAllowed(
                MemberStatus.ACTIVE, MemberRole.USER, true))
                .willReturn(11L);

        AdminDashboardStatsResponse result = reportService.getDashboardStats();

        assertThat(result.todayReportsCount()).isEqualTo(4L);
        assertThat(result.pendingReportsCount()).isEqualTo(7L);
        assertThat(result.processedReportsCount()).isEqualTo(13L);
        assertThat(result.todayLettersCount()).isEqualTo(5L);
        assertThat(result.todayDiariesCount()).isEqualTo(3L);
        assertThat(result.availableReceiversCount()).isEqualTo(11L);
    }

    @Test
    @DisplayName("게시글 신고 상세 정보를 조회하면 타겟 정보와 작성자 닉네임이 포함된다.")
    void getReportDetail_post_success() {

        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.PROFANITY, "신고내용");
        ReflectionTestUtils.setField(report, "id", reportId);

        Member author = Member.create("author@test.com", "pw", "작성자");
        Post post = Post.builder().title("제목").content("원본내용").member(author).build();

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(10L)).willReturn(Optional.of(post));

        ReportDetailResponse detail = reportService.getReportDetail(reportId);

        assertThat(detail.targetInfo().originalContent()).isEqualTo("원본내용");
        assertThat(detail.targetInfo().authorNickname()).isEqualTo("작성자");
    }

    @Test
    @DisplayName("편지(LETTER) 신고 상세 정보를 조회하면 발신자 닉네임과 내용이 포함된다.")
    void getReportDetail_letter_success() {
        Long reportId = 1L;
        Long letterId = 20L;
        Report report = Report.create(1L, letterId, TargetType.LETTER, ReportReason.INAPPROPRIATE, "부적절");
        ReflectionTestUtils.setField(report, "id", reportId);

        Member sender = Member.create("sender@test.com", "pw", "편지발신자");
        Letter letter = mock(Letter.class); // Getter 호출을 위해 mock 활용
        given(letter.getContent()).willReturn("편지 원본 내용");
        given(letter.getSender()).willReturn(sender);

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(letterRepository.findById(letterId)).willReturn(Optional.of(letter));

        ReportDetailResponse detail = reportService.getReportDetail(reportId);

        assertThat(detail.targetInfo().targetType()).isEqualTo("LETTER");
        assertThat(detail.targetInfo().originalContent()).isEqualTo("편지 원본 내용");
        assertThat(detail.targetInfo().authorNickname()).isEqualTo("편지발신자");
    }

    @Test
    @DisplayName("댓글(COMMENT) 신고 상세 정보를 조회하면 작성자 닉네임과 내용이 포함된다.")
    void getReportDetail_comment_success() {
        Long reportId = 2L;
        Long commentId = 30L;
        Report report = Report.create(1L, commentId, TargetType.COMMENT, ReportReason.PROFANITY, "욕설");
        ReflectionTestUtils.setField(report, "id", reportId);

        Member author = Member.create("author@test.com", "pw", "댓글작성자");
        Comment comment = mock(Comment.class);
        given(comment.getContent()).willReturn("댓글 원본 내용");
        given(comment.getAuthor()).willReturn(author);

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(commentRepository.findById(commentId)).willReturn(Optional.of(comment));

        ReportDetailResponse detail = reportService.getReportDetail(reportId);

        assertThat(detail.targetInfo().targetType()).isEqualTo("COMMENT");
        assertThat(detail.targetInfo().authorNickname()).isEqualTo("댓글작성자");
    }

    @Test
    @DisplayName("신고 처리 - 부적절한 신고 무시(REJECT) 시 타겟 변경 없이 상태만 완료된다.")
    void handleReport_reject() {

        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.OTHER, "내용");
        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));

        ReportHandleRequest request = new ReportHandleRequest("REJECT", "사유없음", false, "");

        reportService.handleReport(reportId, request);

        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
    }

    @Test
    @DisplayName("신고 처리 - 게시글 삭제(DELETE) 시 게시글 상태가 HIDDEN으로 변경된다.")
    void handleReport_delete_post() {

        Long reportId = 1L;
        Long postId = 10L;

        Member author = Member.create("test@test.com", "pw", "작성자");
        ReflectionTestUtils.setField(author, "id", 100L);

        Report report = Report.create(1L, postId, TargetType.POST, ReportReason.PROFANITY, "욕설");
        Post post = Post.builder().
                status(PostStatus.PUBLISHED)
                .member(author)
                .build();

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(postId)).willReturn(Optional.of(post));

        ReportHandleRequest request = new ReportHandleRequest("DELETE", "게시글 삭제", false, "");

        reportService.handleReport(reportId, request);

        assertThat(post.getStatus()).isEqualTo(PostStatus.HIDDEN);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
    }

    @Test
    @DisplayName("신고 처리 - 댓글 삭제(DELETE) 시 댓글의 markAsDelete가 호출된다.")
    void handleReport_delete_comment() {
        Long reportId = 1L;
        Long commentId = 30L;
        Member author = Member.create("author@test.com", "pw", "작성자");
        ReflectionTestUtils.setField(author, "id", 100L);

        Comment comment = mock(Comment.class);
        given(comment.getAuthor()).willReturn(author);
        Report report = Report.create(1L, commentId, TargetType.COMMENT, ReportReason.PROFANITY, "욕설");

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(commentRepository.findById(commentId)).willReturn(Optional.of(comment));

        ReportHandleRequest request = new ReportHandleRequest("DELETE", "댓글 삭제", false, "");

        reportService.handleReport(reportId, request);

        verify(comment).markAsDelete(); // markAsDelete 호출 여부 검증
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
        verify(notificationService).send(eq(100L), anyString(), contains("댓글")); // 알림 전송 확인
    }

    @Test
    @DisplayName("신고 처리 - 작성자 정지(BLOCK_USER) 시 해당 유저의 상태가 BLOCKED로 변경된다.")
    void handleReport_block_user() {

        Long reportId = 1L;
        Long postId = 10L;
        Member author = Member.create("test@test.com", "hash", "나쁜유저");
        ReflectionTestUtils.setField(author, "id", 100L);
        Post post = Post.builder().member(author).build();
        Report report = Report.create(1L, postId, TargetType.POST, ReportReason.SPAM, "광고");

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(postId)).willReturn(Optional.of(post));
        given(memberRepository.findById(100L)).willReturn(Optional.of(author));

        ReportHandleRequest request = new ReportHandleRequest("BLOCK_USER", "유저 정지", false, "");

        reportService.handleReport(reportId, request);

        assertThat(author.getStatus()).isEqualTo(MemberStatus.BLOCKED);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
    }

    @Test
    @DisplayName("신고 처리 - 편지 신고 유저 정지(BLOCK_USER) 시 발신자의 상태가 BLOCKED로 변경된다.")
    void handleReport_block_letter_sender() {
        Long reportId = 5L;
        Long letterId = 20L;
        Long senderId = 200L;

        Member sender = Member.create("sender@test.com", "pw", "나쁜발신자");
        ReflectionTestUtils.setField(sender, "id", senderId);

        Letter letter = mock(Letter.class);
        given(letter.getSender()).willReturn(sender);
        Report report = Report.create(1L, letterId, TargetType.LETTER, ReportReason.PERSONAL_INFO, "개인정보");

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(letterRepository.findById(letterId)).willReturn(Optional.of(letter));
        given(memberRepository.findById(senderId)).willReturn(Optional.of(sender));

        ReportHandleRequest request = new ReportHandleRequest("BLOCK_USER", "유저 정지", false, "운영 정책 위반");

        reportService.handleReport(reportId, request);

        assertThat(sender.getStatus()).isEqualTo(MemberStatus.BLOCKED); // 상태 변경 확인
        verify(notificationService).send(eq(senderId), anyString(), eq("운영 정책 위반")); // 커스텀 메시지 확인
    }

    @Test
    @DisplayName("게시글 신고 상세 조회 시 조치 이력(processingAction)이 포함된다.")
    void getReportDetail_success_with_action() {

        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.PROFANITY, "신고내용");
        ReflectionTestUtils.setField(report, "id", reportId);
        ReflectionTestUtils.setField(report, "processingAction", "DELETE"); // 이력 설정

        Post post = Post.builder().content("내용").member(Member.create("a@a.com", "p", "작성자")).build();

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(10L)).willReturn(Optional.of(post));

        ReportDetailResponse detail = reportService.getReportDetail(reportId);

        assertThat(detail.processingAction()).isEqualTo("DELETE");
    }

    @Test
    @DisplayName("신고 처리 - 게시글 삭제(DELETE) 시 상태 변경과 함께 실시간 알림이 발송된다.")
    void handleReport_delete_post_with_sse() {

        Long reportId = 1L;
        Long postId = 10L;
        Long authorId = 100L;

        Member author = Member.create("test@test.com", "pw", "작성자");
        ReflectionTestUtils.setField(author, "id", authorId);

        Post post = Post.builder().status(PostStatus.PUBLISHED).member(author).build();
        Report report = Report.create(1L, postId, TargetType.POST, ReportReason.PROFANITY, "욕설");

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(postId)).willReturn(Optional.of(post));

        ReportHandleRequest request = new ReportHandleRequest("DELETE", "삭제", false, "");

        reportService.handleReport(reportId, request);

        assertThat(post.getStatus()).isEqualTo(PostStatus.HIDDEN);
        assertThat(report.getProcessingAction()).isEqualTo("DELETE");

        // SSE 알림이 피신고자(authorId)에게 발송되었는지 검증
        verify(notificationService).send(eq(authorId), eq("REPORT_RESULT"), contains("삭제"));
    }

    @Test
    @DisplayName("신고 처리 - 유저 정지(BLOCK_USER) 시 유저 상태 변경과 함께 실시간 알림이 발송된다.")
    void handleReport_block_user_with_sse() {

        Long reportId = 1L;
        Long authorId = 100L;
        Member author = Member.create("test@test.com", "hash", "나쁜유저");
        ReflectionTestUtils.setField(author, "id", authorId);

        Post post = Post.builder().member(author).build();
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.SPAM, "광고");

        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));
        given(postRepository.findById(10L)).willReturn(Optional.of(post));
        given(memberRepository.findById(authorId)).willReturn(Optional.of(author));

        ReportHandleRequest request = new ReportHandleRequest("BLOCK_USER", "정지", false, "");

        reportService.handleReport(reportId, request);

        assertThat(author.getStatus()).isEqualTo(MemberStatus.BLOCKED);

        // SSE 알림 발송 검증
        verify(notificationService).send(eq(authorId), eq("REPORT_RESULT"), contains("정지"));
    }

    @Test
    @DisplayName("신고 처리 - 반려(REJECT) 시 알림이 발송되지 않아야 한다.")
    void handleReport_reject_no_sse() {

        Long reportId = 1L;
        Report report = Report.create(1L, 10L, TargetType.POST, ReportReason.OTHER, "내용");
        given(reportPersistencePort.findById(reportId)).willReturn(Optional.of(report));

        ReportHandleRequest request = new ReportHandleRequest("REJECT", "반려", false, "");

        reportService.handleReport(reportId, request);

        assertThat(report.getStatus()).isEqualTo(ReportStatus.PROCESSED);
        // 알림 서비스가 호출되지 않았음을 검증
        verify(notificationService, never()).send(anyLong(), anyString(), anyString());
    }

}
