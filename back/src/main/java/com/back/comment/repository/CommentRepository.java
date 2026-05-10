package com.back.comment.repository;

import com.back.comment.entity.Comment;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public  interface CommentRepository extends JpaRepository<Comment, Long> {
    Slice<Comment> findByPostIdAndParentIsNull(Long postId, Pageable pageable);

    List<Comment> findByParentIdOrderByIdAsc(Long parentId);

    @Lock(LockModeType.OPTIMISTIC)
    @Query("select c from Comment c where c.id = :id")
    Optional<Comment> findWithOptimisticLockById(@Param("id") Long id);

    @Lock(LockModeType.OPTIMISTIC_FORCE_INCREMENT)
    @Query("select c from Comment c where c.id = :id")
    Optional<Comment> findForReplyCreate(@Param("id") Long id);

    boolean existsByParent(Comment parent);

    void deleteByPostId(Long postId);

    void deleteByPostTitleStartingWith(String prefix);
}
