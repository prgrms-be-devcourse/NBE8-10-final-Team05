package com.back.post.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostUpdateReq;
import com.back.post.entity.Post;
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
@DisplayName("게시글 서비스 멤버 연결 테스트")
class PostServiceTest {

  @Mock private PostRepository postRepository;
  @Mock private MemberRepository memberRepository;

  @InjectMocks private PostService postService;

  @Test
  @DisplayName("게시글 생성 시 작성자 멤버를 연결한다")
  void createPostConnectsMember() {
    Member member = savedMember(1L, "member1@test.com", "member1");
    given(memberRepository.findById(1L)).willReturn(Optional.of(member));
    given(postRepository.save(any(Post.class))).willAnswer(invocation -> invocation.getArgument(0));

    postService.createPost(new PostCreateReq("title", "content", "thumbnail"), 1L);

    ArgumentCaptor<Post> captor = ArgumentCaptor.forClass(Post.class);
    then(postRepository).should().save(captor.capture());
    assertThat(captor.getValue().getMember()).isSameAs(member);
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
            .build();
    setId(post, 10L);
    given(postRepository.findById(10L)).willReturn(Optional.of(post));

    assertThatThrownBy(
            () -> postService.updatePost(10L, new PostUpdateReq("new", "content", null), 2L))
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
            .build();
    setId(post, 11L);
    given(postRepository.findById(11L)).willReturn(Optional.of(post));

    postService.deletePost(11L, 1L);

    then(postRepository).should().delete(post);
  }

  private Member savedMember(Long id, String email, String nickname) {
    Member member = Member.create(email, "$2a$10$stored", nickname);
    setId(member, id);
    return member;
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
