package com.back.post.controller;

import com.back.global.rsData.RsData;
import com.back.auth.application.AuthErrorCode;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostInfoRes;
import com.back.post.dto.PostListRes;
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

@RestController
@RequestMapping("/api/v1/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    /* 게시물 생성 */
    @PostMapping
    public ResponseEntity<RsData<Long>> createPost(
            @AuthenticationPrincipal AuthenticatedMember authMember,
            @Valid @RequestBody PostCreateReq request
    ) {
        if (authMember == null) throw AuthErrorCode.AUTHENTICATION_REQUIRED.toException();

        Long postId = postService.createPost(request, authMember.memberId());
        return ResponseEntity.ok(new RsData<>("201-1", "Post created.", postId));
    }

    /* 게시물 다건 조회 */
    @GetMapping
    public ResponseEntity<RsData<Slice<PostListRes>>> getPosts(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) PostCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Slice<PostListRes> data = postService.getPosts(title, category, pageable);
        return ResponseEntity.ok(new RsData<>("200-1", "Posts fetched.", data));
    }

    /* 게시물 단건 조회 */
    @GetMapping("/{id}")
    public ResponseEntity<RsData<PostInfoRes>> getPost(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(new RsData<>("200-2", "Post fetched.", postService.getPost(id)));
    }

    /* 게시물 수정 */
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

    /* 게시물 삭제 */
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
