package com.back.comment.service;


import com.back.auth.application.AuthErrorCode;
import com.back.comment.dto.CommentCreateReq;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentRepository;
import com.back.global.exception.ServiceException;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.entity.Post;
import com.back.post.application.PostErrorCode;
import com.back.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final String ERROR_CODE_BAD_REQUEST = "400-1";
    private static final String ERROR_MSG_CONTENT_BLANK = "내용을 입력해주세요.";

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public Long createComment(Long postId, Long memberId, CommentCreateReq req){
        Member member = memberRepository.findById(memberId)
                .orElseThrow(AuthErrorCode.MEMBER_NOT_FOUND::toException);

        Post post = postRepository.findById(postId)
                .orElseThrow(PostErrorCode.POST_NOT_FOUND::toException);
        String content = validateContent(req.content());
        Comment parent = findParentComment(req.parentCommentId());

        Comment comment = Comment.builder()
                .post(post)
                .author(member)
                .content(content)
                .parent(parent)
                .build();
        return commentRepository.save(comment).getId();
    }

    private String validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new ServiceException(ERROR_CODE_BAD_REQUEST, ERROR_MSG_CONTENT_BLANK);
        }

        return content.trim();
    }

    private Comment findParentComment(Long parentCommentId) {
        if (parentCommentId == null) {
            return null;
        }

        return commentRepository.findById(parentCommentId)
                .orElseThrow(() -> new ServiceException("404-2", "존재하지 않는 댓글 입니다."));
    }
}
