package com.back.post.service;


import com.back.global.exception.ServiceException;
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

    private final PostRepository postRepository;

    @Transactional
    public Long createPost(PostCreateReq req) {

        Post post = Post.builder()
                .title(req.title())
                .content(req.content())
                .thumbnail(req.thumbnail())
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
    public void updatePost(Long postId, PostUpdateReq req) {

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지않는 게시물 입니다."));

        post.update(req.title(), req.content(), req.thumbnail());

    }

    @Transactional
    public void deletePost(Long postId) {

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ServiceException("404-1", "존재하지 않는 게시물 압니다."));

        postRepository.delete(post);

    }


}
