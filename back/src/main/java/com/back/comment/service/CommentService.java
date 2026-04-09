package com.back.comment.service;


import com.back.auth.application.AuthErrorCode;
import com.back.comment.application.CommentErrorCode;
import com.back.comment.dto.CommentCreateReq;
import com.back.comment.dto.CommentInfoRes;
import com.back.comment.dto.CommentPageCache;
import com.back.comment.dto.ReplyInfoRes;
import com.back.comment.entity.Comment;
import com.back.comment.repository.CommentCacheRepository;
import com.back.comment.repository.CommentRepository;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.post.application.PostErrorCode;
import com.back.post.entity.Post;
import com.back.post.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentCacheRepository commentCacheRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    /**
     * 게시글에 일반 댓글 또는 대댓글을 생성합니다.
     *
     * @param postId 댓글이 달릴 게시글 ID
     * @param memberId 댓글 작성자 회원 ID
     * @param req 댓글 내용 및 부모 댓글 ID를 담은 요청 객체
     * @return 생성된 댓글 ID
     */
    @Transactional
    public Long createComment(Long postId, Long memberId, CommentCreateReq req) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(AuthErrorCode.MEMBER_NOT_FOUND::toException);

        Post post = postRepository.findById(postId)
                .orElseThrow(PostErrorCode.POST_NOT_FOUND::toException);

        Comment parentComment = null;
        String content = validateContent(req.content());
        Long parentCommentId = req.parentCommentId();

        if (parentCommentId != null) {
            parentComment = commentRepository.findById(parentCommentId)
                    .orElseThrow(CommentErrorCode.COMMENT_NOT_FOUND::toException);

            if (!parentComment.getPost().getId().equals(postId)) {
                throw CommentErrorCode.INVALID_PARENT_COMMENT.toException();
            }

            if (parentComment.isDeleted()) {
                throw CommentErrorCode.PARENT_COMMENT_DELETED.toException();
            }
        }

        Comment comment = Comment.builder()
                .post(post)
                .author(member)
                .content(content)
                .parent(parentComment)
                .build();
        Comment savedComment = commentRepository.save(comment);
        commentCacheRepository.evictPostPages(postId);
        return savedComment.getId();
    }


    /**
     * 게시글의 부모 댓글 목록을 조회하고, 각 부모 댓글에 대댓글 목록을 함께 묶어 반환합니다.
     *
     * @param postId 댓글을 조회할 게시글 ID
     * @param pageable 부모 댓글 페이지 정보
     * @return 부모 댓글과 대댓글이 포함된 Slice 응답
     */
    @Transactional(readOnly = true)
    public Slice<CommentInfoRes> getComments(Long postId, Pageable pageable){
        postRepository.findById(postId)
                .orElseThrow(PostErrorCode.POST_NOT_FOUND::toException);

        CommentPageCache cachedPage = commentCacheRepository.findPage(postId, pageable.getPageNumber(), pageable.getPageSize());
        if (cachedPage != null) {
            return new SliceImpl<>(cachedPage.content(), pageable, cachedPage.hasNext());
        }

        Slice<Comment> parentComments = commentRepository.findByPostIdAndParentIsNull(postId, pageable);
        List<CommentInfoRes> content = parentComments.stream()
                .map(this::toCommentInfoRes)
                .toList();
        commentCacheRepository.cachePage(
                postId,
                pageable.getPageNumber(),
                pageable.getPageSize(),
                new CommentPageCache(content, parentComments.hasNext())
        );
        return new SliceImpl<>(content, pageable, parentComments.hasNext());
    }



    /**
     * 작성자 본인의 댓글 내용을 수정합니다.
     *
     * @param commentId 수정할 댓글 ID
     * @param memberId 요청한 회원 ID
     * @param content 수정할 댓글 내용
     */
    @Transactional
    public void updateComment(Long commentId, Long memberId, String content) {

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(CommentErrorCode.COMMENT_NOT_FOUND::toException);

        if(!comment.getAuthor().getId().equals(memberId)){
            throw CommentErrorCode.FORBIDDEN.toException();
        }

        if (comment.isDeleted()) {
            throw CommentErrorCode.COMMENT_ALREADY_DELETED.toException();
        }

        comment.modify(validateContent(content));
        commentCacheRepository.evictPostPages(comment.getPost().getId());


    }

    /**
     * 댓글을 삭제합니다.
     * 대댓글이 달린 부모 댓글은 소프트 삭제하고, 자식 댓글이 없으면 실제 삭제합니다.
     *
     * @param commentId 삭제할 댓글 ID
     * @param memberId 요청한 회원 ID
     */
    @Transactional
    public void deleteComment(Long commentId, Long memberId) {

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(CommentErrorCode.COMMENT_NOT_FOUND::toException);

        if(!comment.getAuthor().getId().equals(memberId)){
            throw CommentErrorCode.FORBIDDEN.toException();
        }

        if(comment.isDeleted()){
            return;
        }

        boolean hasChildComments = commentRepository.existsByParent(comment);
        Long postId = comment.getPost().getId();

        if(hasChildComments){
            comment.markAsDelete();
            commentCacheRepository.evictPostPages(postId);
            return;
        }

        commentRepository.delete(comment);
        commentCacheRepository.evictPostPages(postId);
    }

    /**
     * 부모 댓글 1건을 응답 DTO로 변환하면서 해당 댓글의 대댓글 목록을 함께 조립합니다.
     *
     * @param comment 부모 댓글 엔티티
     * @return 대댓글 목록이 포함된 댓글 응답 DTO
     */
    private CommentInfoRes toCommentInfoRes(Comment comment) {
        List<ReplyInfoRes> replies = commentRepository.findByParentIdOrderByIdAsc(comment.getId()).stream()
                .map(ReplyInfoRes::new)
                .toList();
        return new CommentInfoRes(comment, replies);
    }

    /**
     * 댓글 내용을 검증하고 앞뒤 공백을 제거한 값을 반환합니다.
     *
     * @param content 검증할 댓글 내용
     * @return 정리된 댓글 내용
     */
    private String validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw CommentErrorCode.CONTENT_BLANK.toException();
        }

        return content.trim();
    }

}
