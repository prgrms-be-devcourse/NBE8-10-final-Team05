package com.back.post.repository;

import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    Slice<Post> findAllBy(Pageable pageable);

    Slice<Post> findByTitleContaining(String title, Pageable pageable);

    Slice<Post> findByCategory(PostCategory category, Pageable pageable);

    Slice<Post> findByTitleContainingAndCategory(String title, PostCategory category, Pageable pageable);

    long countByCategoryAndCreateDateGreaterThanEqualAndCreateDateLessThan(
            PostCategory category,
            LocalDateTime startInclusive,
            LocalDateTime endExclusive
    );

    boolean existsByTitle(String title);

    long countByTitleStartingWith(String prefix);

    void deleteByTitleStartingWith(String prefix);

    Slice<Post> findAllByStatusNot(PostStatus status, Pageable pageable);

    Slice<Post> findByTitleContainingAndStatusNot(String title, PostStatus status, Pageable pageable);

    Slice<Post> findByCategoryAndStatusNot(PostCategory category, PostStatus status, Pageable pageable);

    Slice<Post> findByTitleContainingAndCategoryAndStatusNot(
            String title,
            PostCategory category,
            PostStatus status,
            Pageable pageable
    );

    java.util.Optional<Post> findByIdAndStatusNot(Long id, PostStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post p set p.viewCount = p.viewCount + :delta where p.id = :postId")
    int incrementViewCount(@Param("postId") Long postId, @Param("delta") int delta);

    @Query("""
        SELECT p
        FROM Post p
        JOIN FETCH p.member m
        WHERE m.id = :memberId
        ORDER BY p.createDate DESC
        """)
    java.util.List<Post> findRecentByMemberId(@Param("memberId") Long memberId, Pageable pageable);
}
