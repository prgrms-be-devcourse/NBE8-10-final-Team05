package com.back.post.service;


import com.back.auth.application.AuthErrorCode;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.application.PostErrorCode;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostInfoRes;
import com.back.post.dto.PostListRes;
import com.back.post.dto.PostUpdateReq;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public Long createPost(PostCreateReq req, Long memberId) {
        Member member = findMemberById(memberId);

        Post post = Post.builder()
                .title(req.title())
                .content(req.content())
                .thumbnail(req.thumbnail())
                .member(member)
                .category(req.category())
                .build();

       post = postRepository.save(post);
        return post.getId();

    }

    @Transactional(readOnly = true)
    public Slice<PostListRes> getPosts(String title, PostCategory category, Pageable pageable) {
        Slice<Post> posts;
        boolean hasTitle = StringUtils.hasText(title);

        if (hasTitle && category != null) {
            posts = postRepository.findByTitleContainingAndCategory(title, category, pageable);
        } else if (hasTitle) {
            posts = postRepository.findByTitleContaining(title, pageable);
        } else if (category != null) {
            posts = postRepository.findByCategory(category, pageable);
        } else {
            posts = postRepository.findAllBy(pageable);
        }

        return posts.map(PostListRes::from);
    }


    @Transactional(readOnly = true)
    public PostInfoRes getPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(PostErrorCode.POST_NOT_FOUND::toException);

        return PostInfoRes.from(post);
    }


    @Transactional
    public void updatePost(Long postId, PostUpdateReq req, Long memberId) {
        Post post = findOwnedPost(postId, memberId);

        post.update(req.title(), req.content(), req.thumbnail(),req.category());

    }

    @Transactional
    public void deletePost(Long postId, Long memberId) {
        Post post = findOwnedPost(postId, memberId);

        postRepository.delete(post);

    }

    private Member findMemberById(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(AuthErrorCode.MEMBER_NOT_FOUND::toException);
    }

    private Post findOwnedPost(Long postId, Long memberId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(PostErrorCode.POST_NOT_FOUND::toException);

        if (post.getMember() == null || !post.getMember().getId().equals(memberId)) {
            throw PostErrorCode.FORBIDDEN.toException();
        }

        return post;
    }


}
