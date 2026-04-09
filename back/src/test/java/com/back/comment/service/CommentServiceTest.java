package com.back.comment.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import com.back.comment.dto.CommentCreateReq;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentCacheRepository;
import com.back.comment.repository.CommentRepository;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@DisplayName("댓글 서비스 테스트")
class CommentServiceTest {

  @Mock private CommentRepository commentRepository;
  @Mock private CommentCacheRepository commentCacheRepository;
  @Mock private PostRepository postRepository;
  @Mock private MemberRepository memberRepository;

  @InjectMocks private CommentService commentService;

  @Test
  @DisplayName("일반 댓글 생성 시 작성자와 게시글이 연결된다")
  void createCommentConnectsAuthorAndPost() {
    Member member = savedMember(1L, "member1@test.com", "member1");
    Post post = savedPost(10L, member);
    given(memberRepository.findById(1L)).willReturn(Optional.of(member));
    given(postRepository.findById(10L)).willReturn(Optional.of(post));
    given(commentRepository.save(any(Comment.class))).willAnswer(invocation -> invocation.getArgument(0));

    commentService.createComment(10L, 1L, new CommentCreateReq(" 댓글 내용 ", null, null));

    ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
    then(commentRepository).should().save(captor.capture());
    assertThat(captor.getValue().getAuthor()).isSameAs(member);
    assertThat(captor.getValue().getPost()).isSameAs(post);
    assertThat(captor.getValue().getParent()).isNull();
    assertThat(captor.getValue().getContent()).isEqualTo("댓글 내용");
  }

  @Test
  @DisplayName("다른 게시글의 댓글을 부모 댓글로 선택하면 예외를 던진다")
  void createReplyFailsWhenParentBelongsToAnotherPost() {
    Member member = savedMember(1L, "member1@test.com", "member1");
    Post requestPost = savedPost(10L, member);
    Post anotherPost = savedPost(11L, member);
    Comment parent = Comment.builder().author(member).post(anotherPost).content("parent").build();
    setId(parent, 100L);

    given(memberRepository.findById(1L)).willReturn(Optional.of(member));
    given(postRepository.findById(10L)).willReturn(Optional.of(requestPost));
    given(commentRepository.findById(100L)).willReturn(Optional.of(parent));

    assertThatThrownBy(() -> commentService.createComment(10L, 1L, new CommentCreateReq("reply", null, 100L)))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("400-2"));
  }

  @Test
  @DisplayName("본인 댓글만 수정할 수 있다")
  void updateCommentRequiresOwner() {
    Member author = savedMember(1L, "member1@test.com", "member1");
    Comment comment = Comment.builder().author(author).post(savedPost(10L, author)).content("old").build();
    setId(comment, 20L);
    given(commentRepository.findById(20L)).willReturn(Optional.of(comment));

    assertThatThrownBy(() -> commentService.updateComment(20L, 2L, "new"))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("403-1"));
  }

  @Test
  @DisplayName("자식 댓글이 있는 댓글은 소프트 삭제한다")
  void deleteCommentSoftDeletesWhenRepliesExist() {
    Member author = savedMember(1L, "member1@test.com", "member1");
    Comment comment = Comment.builder().author(author).post(savedPost(10L, author)).content("comment").build();
    setId(comment, 30L);
    given(commentRepository.findById(30L)).willReturn(Optional.of(comment));
    given(commentRepository.existsByParent(comment)).willReturn(true);

    commentService.deleteComment(30L, 1L);

    assertThat(comment.isDeleted()).isTrue();
    assertThat(comment.getContent()).isEqualTo("[삭제된 댓글입니다.]");
    then(commentRepository).should(never()).delete(comment);
  }

  @Test
  @DisplayName("자식 댓글이 없는 댓글은 실제 삭제한다")
  void deleteCommentHardDeletesWhenNoRepliesExist() {
    Member author = savedMember(1L, "member1@test.com", "member1");
    Comment comment = Comment.builder().author(author).post(savedPost(10L, author)).content("comment").build();
    setId(comment, 31L);
    given(commentRepository.findById(31L)).willReturn(Optional.of(comment));
    given(commentRepository.existsByParent(comment)).willReturn(false);

    commentService.deleteComment(31L, 1L);

    then(commentRepository).should().delete(comment);
  }

  private Member savedMember(Long id, String email, String nickname) {
    Member member = Member.create(email, "$2a$10$stored", nickname);
    setId(member, id);
    return member;
  }

  private Post savedPost(Long id, Member member) {
    Post post =
        Post.builder()
            .title("title")
            .content("content")
            .thumbnail("thumbnail")
            .member(member)
            .category(PostCategory.DAILY)
            .status(PostStatus.DRAFT)
            .build();
    setId(post, id);
    return post;
  }

  private void setId(Object target, Long id) {
    try {
      Class<?> type = target.getClass();
      while (type != null) {
        try {
          var field = type.getDeclaredField("id");
          field.setAccessible(true);
          field.set(target, id);
          return;
        } catch (NoSuchFieldException ignored) {
          type = type.getSuperclass();
        }
      }
      throw new IllegalStateException("id field not found");
    } catch (ReflectiveOperationException exception) {
      throw new IllegalStateException(exception);
    }
  }
}
