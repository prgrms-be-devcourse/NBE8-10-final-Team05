package com.back.post.repository;

import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    Slice<Post> findAllBy(Pageable pageable);

    Slice<Post> findByTitleContaining(String title, Pageable pageable);

    Slice<Post> findByCategory(PostCategory category, Pageable pageable);

    Slice<Post> findByTitleContainingAndCategory(String title, PostCategory category, Pageable pageable);
}
