package com.back.comment.repository;

import com.back.comment.entity.Comment;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public  interface CommentRepository extends JpaRepository<Comment, Long> {
    Slice<Comment> findByPostIdAndParentIsNull(Long postId, Pageable pageable);

    List<Comment> findByParentIdOrderByIdAsc(Long parentId);

    boolean existsByParent(Comment parent);

    void deleteByPostId(Long postId);
}
