package com.back.comment.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.back.comment.dto.CommentCreateReq;
import com.back.comment.repository.CommentCacheRepository;
import com.back.comment.repository.CommentRepository;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.repository.PostRepository;
import com.google.genai.Client;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
@DisplayName("댓글 서비스 동시성 테스트")
class CommentServiceConcurrencyTest {

  @Container
  static PostgreSQLContainer<?> postgres =
      new PostgreSQLContainer<>("postgres:16-alpine")
          .withDatabaseName("maum_on_test")
          .withUsername("maum_on")
          .withPassword("maum_on");

  @DynamicPropertySource
  static void registerProperties(DynamicPropertyRegistry registry) {
    registry.add("DEV_DB_URL", postgres::getJdbcUrl);
    registry.add("DEV_DB_USERNAME", postgres::getUsername);
    registry.add("DEV_DB_PASSWORD", postgres::getPassword);
  }

  @Autowired private CommentService commentService;
  @Autowired private CommentRepository commentRepository;
  @Autowired private MemberRepository memberRepository;
  @Autowired private PostRepository postRepository;
  @Autowired private PasswordEncoder passwordEncoder;

  @MockitoBean private CommentCacheRepository commentCacheRepository;
  @MockitoBean private Client geminiClient;

  @Test
  @DisplayName("같은 댓글 수정과 삭제가 동시에 들어오면 하나만 성공한다")
  void concurrentUpdateAndDeleteAllowOnlyOneSuccess() throws Exception {
    Member member = createMember("comment-owner");
    Post post = createPost(member);
    Long commentId =
        commentService.createComment(post.getId(), member.getId(), new CommentCreateReq("before", null, null));

    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService executorService = Executors.newFixedThreadPool(2);

    try {
      List<Callable<AttemptResult>> tasks =
          List.of(
              () ->
                  runWithBarrier(
                      ready,
                      start,
                      () -> {
                        commentService.updateComment(commentId, member.getId(), "after");
                        return AttemptResult.success("update");
                      }),
              () ->
                  runWithBarrier(
                      ready,
                      start,
                      () -> {
                        commentService.deleteComment(commentId, member.getId());
                        return AttemptResult.success("delete");
                      }));

      List<Future<AttemptResult>> futures = new ArrayList<>();
      for (Callable<AttemptResult> task : tasks) {
        futures.add(executorService.submit(task));
      }

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      start.countDown();

      List<AttemptResult> results = collectResults(futures);
      assertThat(results.stream().filter(AttemptResult::success)).hasSize(1);
      assertThat(results.stream().filter(result -> "OPTIMISTIC_LOCK".equals(result.errorCode))).hasSize(1);
    } finally {
      executorService.shutdownNow();
    }
  }

  @Test
  @DisplayName("부모 댓글 삭제와 대댓글 등록이 동시에 들어오면 하나만 성공한다")
  void concurrentDeleteAndReplyAllowOnlyOneSuccess() throws Exception {
    Member parentAuthor = createMember("parent-owner");
    Member replyAuthor = createMember("reply-owner");
    Post post = createPost(parentAuthor);
    Long parentCommentId =
        commentService.createComment(post.getId(), parentAuthor.getId(), new CommentCreateReq("parent", null, null));

    CountDownLatch ready = new CountDownLatch(2);
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService executorService = Executors.newFixedThreadPool(2);

    try {
      List<Callable<AttemptResult>> tasks =
          List.of(
              () ->
                  runWithBarrier(
                      ready,
                      start,
                      () -> {
                        commentService.deleteComment(parentCommentId, parentAuthor.getId());
                        return AttemptResult.success("delete");
                      }),
              () ->
                  runWithBarrier(
                      ready,
                      start,
                      () -> {
                        commentService.createComment(
                            post.getId(), replyAuthor.getId(), new CommentCreateReq("reply", null, parentCommentId));
                        return AttemptResult.success("reply");
                      }));

      List<Future<AttemptResult>> futures = new ArrayList<>();
      for (Callable<AttemptResult> task : tasks) {
        futures.add(executorService.submit(task));
      }

      assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
      start.countDown();

      List<AttemptResult> results = collectResults(futures);
      assertThat(results.stream().filter(AttemptResult::success)).hasSize(1);
      assertThat(results.stream().filter(result -> "OPTIMISTIC_LOCK".equals(result.errorCode))).hasSize(1);
    } finally {
      executorService.shutdownNow();
    }
  }

  private AttemptResult runWithBarrier(
      CountDownLatch ready, CountDownLatch start, Callable<AttemptResult> action) throws Exception {
    ready.countDown();
    assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();

    try {
      return action.call();
    } catch (ObjectOptimisticLockingFailureException exception) {
      return AttemptResult.failure("OPTIMISTIC_LOCK");
    } catch (ServiceException exception) {
      return AttemptResult.failure(exception.getRsData().resultCode());
    }
  }

  private List<AttemptResult> collectResults(List<Future<AttemptResult>> futures) throws Exception {
    List<AttemptResult> results = new ArrayList<>();
    for (Future<AttemptResult> future : futures) {
      results.add(future.get(10, TimeUnit.SECONDS));
    }
    return results;
  }

  private Member createMember(String prefix) {
    String unique = UUID.randomUUID().toString().replace("-", "");
    return memberRepository.saveAndFlush(
        Member.create(
            prefix + "-" + unique + "@test.com",
            passwordEncoder.encode("plain-pass-1234"),
            prefix + "-" + unique.substring(0, 8)));
  }

  private Post createPost(Member author) {
    return postRepository.saveAndFlush(
        Post.builder()
            .title("title-" + UUID.randomUUID())
            .content("content")
            .summary("summary")
            .thumbnail("thumbnail")
            .member(author)
            .category(PostCategory.DAILY)
            .build());
  }

  private record AttemptResult(boolean success, String operation, String errorCode) {

    private static AttemptResult success(String operation) {
      return new AttemptResult(true, operation, null);
    }

    private static AttemptResult failure(String errorCode) {
      return new AttemptResult(false, null, errorCode);
    }
  }
}
