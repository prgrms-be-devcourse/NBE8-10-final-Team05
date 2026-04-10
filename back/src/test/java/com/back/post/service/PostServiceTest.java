package com.back.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.back.comment.repository.CommentRepository;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostUpdateReq;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostResolutionStatus;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import com.back.post.repository.PostViewCountRedisRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;

@ExtendWith(MockitoExtension.class)
@DisplayName("게시글 서비스 멤버 연결 테스트")
class PostServiceTest {

  @Mock private PostRepository postRepository;
  @Mock private PostViewCountRedisRepository postViewCountRedisRepository;
  @Mock private MemberRepository memberRepository;
  @Mock private CommentRepository commentRepository;

  @InjectMocks private PostService postService;

  @Test
  @DisplayName("게시글 생성 시 작성자 멤버를 연결한다")
  void createPostConnectsMember() {
    Member member = savedMember(1L, "member1@test.com", "member1");
    given(memberRepository.findById(1L)).willReturn(Optional.of(member));
    given(postRepository.save(any(Post.class))).willAnswer(invocation -> invocation.getArgument(0));

    postService.createPost(
        new PostCreateReq("title", "content", "thumbnail", PostCategory.WORRY), 1L);

    ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
    then(postRepository).should().save(captor.capture());
    assertThat(captor.getValue().getMember()).isSameAs(member);
    assertThat(captor.getValue().getCategory()).isEqualTo(PostCategory.WORRY);
    assertThat(captor.getValue().getSummary()).isEqualTo("content");
    assertThat(captor.getValue().getResolutionStatus()).isEqualTo(PostResolutionStatus.ONGOING);
  }

  @Test
  @DisplayName("게시글 수정은 작성자 본인만 할 수 있다")
  void updatePostRequiresOwner() {
    Member author = savedMember(1L, "member1@test.com", "member1");
    Post post =
        Post.builder()
            .title("title")
            .content("content")
            .thumbnail("thumbnail")
            .member(author)
            .category(PostCategory.DAILY)
            .build();
    setId(post, 10L);
    given(postRepository.findById(10L)).willReturn(Optional.of(post));

    assertThatThrownBy(
            () ->
                postService.updatePost(
                    10L, new PostUpdateReq("new", "content", null, PostCategory.QUESTION), 2L))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("403-1"));
  }

  @Test
  @DisplayName("게시글 삭제는 작성자 본인일 때만 수행된다")
  void deletePostByOwner() {
    Member author = savedMember(1L, "member1@test.com", "member1");
    Post post =
        Post.builder()
            .title("title")
            .content("content")
            .thumbnail("thumbnail")
            .member(author)
            .category(PostCategory.DAILY)
            .build();
    setId(post, 11L);
    given(postRepository.findById(11L)).willReturn(Optional.of(post));

    postService.deletePost(11L, 1L);

    then(commentRepository).should().deleteByPostId(11L);
    then(postRepository).should().delete(post);
  }

  @Test
  @DisplayName("게시글 수정 시 요약도 함께 갱신된다")
  void updatePostUpdatesSummary() {
    Member author = savedMember(1L, "member1@test.com", "member1");
    Post post =
        Post.builder()
            .title("title")
            .content("content")
            .summary("content")
            .thumbnail("thumbnail")
            .member(author)
            .category(PostCategory.DAILY)
            .build();
    setId(post, 12L);
    given(postRepository.findById(12L)).willReturn(Optional.of(post));

    postService.updatePost(
        12L,
        new PostUpdateReq("new", "  새로운   본문   내용  ", null, PostCategory.QUESTION),
        1L);

    assertThat(post.getSummary()).isEqualTo("새로운 본문 내용");
    assertThat(post.getResolutionStatus()).isEqualTo(PostResolutionStatus.ONGOING);
  }

  @Test
  @DisplayName("작성자는 고민 상태를 변경할 수 있다")
  void updateResolutionStatusByOwner() {
    Member author = savedMember(1L, "member1@test.com", "member1");
    Post post =
        Post.builder()
            .title("title")
            .content("content")
            .summary("content")
            .thumbnail("thumbnail")
            .member(author)
            .category(PostCategory.DAILY)
            .build();
    setId(post, 13L);
    given(postRepository.findById(13L)).willReturn(Optional.of(post));

    postService.updateResolutionStatus(13L, PostResolutionStatus.RESOLVED, 1L);

    assertThat(post.getResolutionStatus()).isEqualTo(PostResolutionStatus.RESOLVED);
  }

  @Test
  @DisplayName("게시글 목록 조회 시 숨김 게시글은 제외한다")
  void getPostsExcludesHiddenPosts() {
    Pageable pageable = PageRequest.of(0, 10);
    Member author = savedMember(1L, "member1@test.com", "member1");
    Post visiblePost = savedPost(20L, author);

    given(postRepository.findAllByStatusNot(PostStatus.HIDDEN, pageable))
        .willReturn(new SliceImpl<>(List.of(visiblePost), pageable, false));

    var result = postService.getPosts(null, null, pageable);

    assertThat(result.getContent()).hasSize(1);
    then(postRepository).should().findAllByStatusNot(PostStatus.HIDDEN, pageable);
  }

  @Test
  @DisplayName("숨김 게시글 상세 조회는 존재하지 않는 게시글로 처리한다")
  void getPostFailsWhenHidden() {
    given(postRepository.findByIdAndStatusNot(21L, PostStatus.HIDDEN)).willReturn(Optional.empty());

    assertThatThrownBy(() -> postService.getPost(21L))
        .isInstanceOf(ServiceException.class)
        .satisfies(
            exception ->
                assertThat(((ServiceException) exception).getRsData().resultCode()).isEqualTo("404-1"));
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
            .summary("content")
            .thumbnail("thumbnail")
            .member(member)
            .category(PostCategory.DAILY)
            .status(PostStatus.PUBLISHED)
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
