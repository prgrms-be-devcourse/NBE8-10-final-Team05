package com.back.post.service;

import com.back.post.repository.PostRepository;
import com.back.post.repository.PostViewCountRedisRepository;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class PostViewCountSyncScheduler {
  private final PostViewCountRedisRepository postViewCountRedisRepository;
  private final PostRepository postRepository;

  @Scheduled(fixedDelayString = "${post.view-count-sync-delay-ms:60000}")
  @Transactional
  public void syncViewCounts() {
    Map<Long, Integer> pendingViewCounts = postViewCountRedisRepository.drainAllViewCounts();
    if (pendingViewCounts.isEmpty()) {
      return;
    }

    pendingViewCounts.forEach((postId, delta) -> {
      int updated = postRepository.incrementViewCount(postId, delta);
      if (updated == 0) {
        log.warn("조회수 동기화 대상 게시글을 찾지 못했습니다. postId={}", postId);
      }
    });
  }
}
