package com.back.post.controller;

import com.back.global.rsData.RsData;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostInfoRes;
import com.back.post.dto.PostListRes;
import com.back.post.dto.PostUpdateReq;
import com.back.post.service.PostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    /* 게시물 생성 */
    @PostMapping
    public RsData<Long> createPost(
            @Valid @RequestBody PostCreateReq request
    ) {
        Long postId = postService.createPost(request);
        return new RsData<>("201-1", "Post created.", postId);
    }

    /* 게시물 다건 조회 */
    @GetMapping
    public RsData<List<PostListRes>> getPosts() {
        return new RsData<>("200-1", "Posts fetched.", postService.getPosts());
    }

    /* 게시물 단건 조회 */
    @GetMapping("/{id}")
    public RsData<PostInfoRes> getPost(
            @PathVariable Long id
    ) {
        return new RsData<>("200-2", "Post fetched.", postService.getPost(id));
    }

    /* 게시물 수정 */
    @PutMapping("/{id}")
    public RsData<Void> updatePost(
            @PathVariable Long id,
            @Valid @RequestBody PostUpdateReq request
    ) {
        postService.updatePost(id, request);
        return new RsData<>("200-3", "Post updated.");
    }

    /* 게시물 삭제 */
    @DeleteMapping("/{id}")
    public RsData<Void> deletePost(
            @PathVariable Long id
    ) {
        postService.deletePost(id);
        return new RsData<>("200-4", "Post deleted.");
    }
}
