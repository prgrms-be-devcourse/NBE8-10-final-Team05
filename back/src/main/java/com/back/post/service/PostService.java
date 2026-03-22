package com.back.post.service;


import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostInfoRes;
import com.back.post.dto.PostListRes;
import com.back.post.dto.PostUpdateReq;
import com.back.post.entity.Post;
import com.back.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final String ERROR_CODE_NOT_FOUND = "404-1";
    private static final String ERROR_CODE_FORBIDDEN = "403-1";
    private static final String ERROR_MSG_POST_NOT_FOUND = "존재하지 않는 게시물 입니다.";
    private static final String ERROR_MSG_MEMBER_NOT_FOUND = "Member not found.";
    private static final String ERROR_MSG_FORBIDDEN = "You do not have permission.";

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
                .build();

       post = postRepository.save(post);
        return post.getId();

    }

    @Transactional(readOnly = true)
    public List<PostListRes> getPosts() {
        return postRepository.findAll().stream()
                .map(PostListRes::from)
                .toList();

    }

    ;

    @Transactional(readOnly = true)
    public PostInfoRes getPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new ServiceException("401-1","존재하지않는 게시물 입니다."));

        return PostInfoRes.from(post);
    }


    @Transactional
    public void updatePost(Long postId, PostUpdateReq req, Long memberId) {
        Post post = findOwnedPost(postId, memberId);

        post.update(req.title(), req.content(), req.thumbnail());

    }

    @Transactional
    public void deletePost(Long postId, Long memberId) {
        Post post = findOwnedPost(postId, memberId);

        postRepository.delete(post);

    }

    private Member findMemberById(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new ServiceException(ERROR_CODE_NOT_FOUND, ERROR_MSG_MEMBER_NOT_FOUND));
    }

    private Post findOwnedPost(Long postId, Long memberId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ServiceException(ERROR_CODE_NOT_FOUND, ERROR_MSG_POST_NOT_FOUND));

        if (post.getMember() == null || !post.getMember().getId().equals(memberId)) {
            throw new ServiceException(ERROR_CODE_FORBIDDEN, ERROR_MSG_FORBIDDEN);
        }

        return post;
    }


}
