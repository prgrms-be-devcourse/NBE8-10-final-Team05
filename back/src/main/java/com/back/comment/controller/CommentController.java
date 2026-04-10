package com.back.comment.controller;


import com.back.auth.application.AuthErrorCode;
import com.back.comment.controller.docs.CommentApiDocs;
import com.back.comment.dto.CommentCreateReq;
import com.back.comment.dto.CommentInfoRes;
import com.back.comment.dto.CommentUpdateReq;
import com.back.comment.service.CommentService;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CommentController implements CommentApiDocs {

    private final CommentService commentService;

    /**
     * 게시글에 댓글 또는 대댓글을 생성합니다.
     *
     * @param postId 댓글이 달릴 게시글 ID
     * @param req 댓글 생성 요청 객체
     * @param authMember 인증된 회원 정보
     * @return 생성된 댓글 리소스 위치를 담은 201 응답
     */
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<Void> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateReq req,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        Long commentId = commentService.createComment(postId, authMember.memberId(), req);

        return ResponseEntity
                .created(URI.create("/api/v1/posts/" + postId + "/comments/" + commentId))
                .build();
    }

    /**
     * 게시글의 부모 댓글 목록을 조회합니다.
     *
     * @param postId 댓글을 조회할 게시글 ID
     * @param page 부모 댓글 페이지 번호
     * @param size 부모 댓글 페이지 크기
     * @return 대댓글 목록이 포함된 부모 댓글 Slice 응답
     */
    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<RsData<Slice<CommentInfoRes>>> getComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Slice<CommentInfoRes> data = commentService.getComments(postId, pageable);

        return ResponseEntity.ok(
                new RsData<>("200-3", "Comments fetched.", data)
        );
    }

    /**
     * 작성자 본인의 댓글 내용을 수정합니다.
     *
     * @param commentId 수정할 댓글 ID
     * @param req 댓글 수정 요청 객체
     * @param authMember 인증된 회원 정보
     * @return 200 OK 응답
     */
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<Void> updateComment(
            @PathVariable("commentId") Long commentId,
            @RequestBody @Valid CommentUpdateReq req,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ){
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        commentService.updateComment(commentId, authMember.memberId(), req.content());

        return ResponseEntity.ok().build();
    }

    /**
     * 작성자 본인의 댓글을 삭제합니다.
     *
     * @param commentId 삭제할 댓글 ID
     * @param authMember 인증된 회원 정보
     * @return 삭제 완료 응답
     */
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<RsData<Void>> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthenticatedMember authMember
    ) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        commentService.deleteComment(commentId, authMember.memberId());

        return ResponseEntity.ok(
                new RsData<>("200-4", "Comment deleted.")
        );
    }
}
