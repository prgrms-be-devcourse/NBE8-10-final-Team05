package com.back.post.controller;

import com.back.global.rsData.RsData;
import com.back.auth.application.AuthErrorCode;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.post.controller.docs.PostApiDocs;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostInfoRes;
import com.back.post.dto.PostListRes;
import com.back.post.dto.PostResolutionStatusUpdateReq;
import com.back.post.dto.PostUpdateReq;
import com.back.post.entity.PostCategory;
import com.back.post.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController implements PostApiDocs {

    private final PostService postService;

    /**
     * 인증된 회원을 작성자로 하여 게시글을 생성합니다.
     *
     * @param authMember 인증된 회원 정보
     * @param request 게시글 생성 요청 객체
     * @return 생성된 게시글 ID 응답
     */
    @PostMapping
    public ResponseEntity<RsData<Long>> createPost(
            @AuthenticationPrincipal AuthenticatedMember authMember,
            @Valid @RequestBody PostCreateReq request
    ) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        Long postId = postService.createPost(request, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("201-1", "Post created.", postId));
    }

    /**
     * 제목과 카테고리 조건에 따라 게시글 목록을 조회합니다.
     *
     * @param title 제목 검색어
     * @param category 게시글 카테고리
     * @param page 페이지 번호
     * @param size 페이지 크기
     * @return 조건에 맞는 게시글 목록 Slice 응답
     */
    @GetMapping
    public ResponseEntity<RsData<Slice<PostListRes>>> getPosts(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) PostCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createDate"));
        Slice<PostListRes> data = postService.getPosts(title, category, pageable);
        return ResponseEntity.ok(new RsData<>("200-1", "Posts fetched.", data));
    }

    /**
     * 게시글 상세 정보를 조회합니다.
     *
     * @param id 조회할 게시글 ID
     * @return 게시글 상세 응답
     */
    @GetMapping("/{id}")
    public ResponseEntity<RsData<PostInfoRes>> getPost(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(new RsData<>("200-2", "Post fetched.", postService.getPost(id)));
    }

    /**
     * 작성자 본인의 게시글을 수정합니다.
     *
     * @param authMember 인증된 회원 정보
     * @param id 수정할 게시글 ID
     * @param request 게시글 수정 요청 객체
     * @return 수정 완료 응답
     */
    @PutMapping("/{id}")
    public ResponseEntity<RsData<Void>> updatePost(
            @AuthenticationPrincipal AuthenticatedMember authMember,
            @PathVariable Long id,
            @Valid @RequestBody PostUpdateReq request
    ) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        postService.updatePost(id, request, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-3", "Post updated."));
    }

    /**
     * 작성자 본인의 게시글 고민 상태를 변경합니다.
     *
     * @param authMember 인증된 회원 정보
     * @param id 상태를 변경할 게시글 ID
     * @param request 고민 상태 변경 요청 객체
     * @return 상태 변경 완료 응답
     */
    @PatchMapping("/{id}/resolution-status")
    public ResponseEntity<RsData<Void>> updateResolutionStatus(
            @AuthenticationPrincipal AuthenticatedMember authMember,
            @PathVariable Long id,
            @Valid @RequestBody PostResolutionStatusUpdateReq request
    ) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        postService.updateResolutionStatus(id, request.resolutionStatus(), authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-5", "Post resolution status updated."));
    }

    /**
     * 작성자 본인의 게시글을 삭제합니다.
     *
     * @param authMember 인증된 회원 정보
     * @param id 삭제할 게시글 ID
     * @return 삭제 완료 응답
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<RsData<Void>> deletePost(
            @AuthenticationPrincipal AuthenticatedMember authMember,
            @PathVariable Long id
    ) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        postService.deletePost(id, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("200-4", "Post deleted."));
    }
}
