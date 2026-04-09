package com.back.comment.repository;

import com.back.comment.dto.CommentPageCache;
import java.time.Duration;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommentCacheRepository {
  private static final Duration COMMENT_CACHE_TTL = Duration.ofMinutes(10);
  private static final String COMMENT_PAGE_KEY_PREFIX = "comment:page:";
  private static final String COMMENT_PAGE_SET_KEY_PREFIX = "comment:pages:";

  private final RedisTemplate<String, Object> redisTemplate;

  public CommentPageCache findPage(Long postId, int page, int size) {
    Object cached = redisTemplate.opsForValue().get(buildPageKey(postId, page, size));
    if (cached instanceof CommentPageCache commentPageCache) {
      return commentPageCache;
    }
    return null;
  }

  public void cachePage(Long postId, int page, int size, CommentPageCache cache) {
    String pageKey = buildPageKey(postId, page, size);
    String pageSetKey = buildPageSetKey(postId);

    redisTemplate.opsForValue().set(pageKey, cache, COMMENT_CACHE_TTL);
    redisTemplate.opsForSet().add(pageSetKey, pageKey);
    redisTemplate.expire(pageSetKey, COMMENT_CACHE_TTL);
  }

  public void evictPostPages(Long postId) {
    String pageSetKey = buildPageSetKey(postId);
    Set<Object> pageKeys = redisTemplate.opsForSet().members(pageSetKey);

    if (pageKeys != null && !pageKeys.isEmpty()) {
      redisTemplate.delete(pageKeys.stream().map(String::valueOf).toList());
    }

    redisTemplate.delete(pageSetKey);
  }

  private String buildPageKey(Long postId, int page, int size) {
    return COMMENT_PAGE_KEY_PREFIX + postId + ":" + page + ":" + size;
  }

  private String buildPageSetKey(Long postId) {
    return COMMENT_PAGE_SET_KEY_PREFIX + postId;
  }
}
