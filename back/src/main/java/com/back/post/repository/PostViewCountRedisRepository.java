package com.back.post.repository;

import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PostViewCountRedisRepository {
  private static final String VIEW_COUNT_HASH_KEY = "post:view-counts";

  private final RedisTemplate<String, Object> redisTemplate;

  public long incrementViewCount(Long postId) {
    Long nextValue = redisTemplate.opsForHash().increment(VIEW_COUNT_HASH_KEY, postId.toString(), 1);
    return nextValue == null ? 0L : nextValue;
  }

  public Map<Long, Integer> drainAllViewCounts() {
    Map<Object, Object> entries = redisTemplate.opsForHash().entries(VIEW_COUNT_HASH_KEY);
    if (entries.isEmpty()) {
      return Map.of();
    }

    Map<Long, Integer> viewCounts = new HashMap<>();
    for (Map.Entry<Object, Object> entry : entries.entrySet()) {
      Long postId = Long.parseLong(String.valueOf(entry.getKey()));
      Integer delta = Integer.parseInt(String.valueOf(entry.getValue()));
      if (delta > 0) {
        viewCounts.put(postId, delta);
      }
    }

    redisTemplate.delete(VIEW_COUNT_HASH_KEY);
    return viewCounts;
  }
}
