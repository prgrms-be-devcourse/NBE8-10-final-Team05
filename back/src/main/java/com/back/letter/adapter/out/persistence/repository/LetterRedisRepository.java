package com.back.letter.adapter.out.persistence.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

@Component
@RequiredArgsConstructor
public class LetterRedisRepository {
    private final RedisTemplate<String, Object> redisTemplate;
    private static final String KEY = "letter:receiver:pool";
    private static final String WRITING_KEY_PREFIX = "letter:writing:";

    // 수신 가능 유저 추가
    public void addReceiver(Long memberId) {
        redisTemplate.opsForSet().add(KEY, memberId.toString());
    }

    // 랜덤 유저 한 명 추출
    public Long getRandomReceiver() {
        Object memberId = redisTemplate.opsForSet().randomMember(KEY);
        return memberId != null ? Long.parseLong(String.valueOf(memberId)) : null;
    }

    // 작성 중 상태 저장
    public void setWritingStatus(long letterId) {
        String key = WRITING_KEY_PREFIX + letterId;
        redisTemplate.opsForValue().set(key, "WRITING", Duration.ofSeconds(60));
    }

    // 작성 중 여부 확인
    public boolean isWriting(long letterId) {
        return redisTemplate.hasKey(WRITING_KEY_PREFIX + letterId);
    }

    // 작성 완료 시 즉시 삭제
    public void deleteWritingStatus(long letterId) {
        redisTemplate.delete(WRITING_KEY_PREFIX + letterId);
    }

    public void addRecentReceiver(long receiverId) {
        String key = "letter:recent:receivers";
        redisTemplate.opsForList().leftPush(key, String.valueOf(receiverId));
        redisTemplate.opsForList().trim(key, 0, 19);
    }

    public List<String> getRecentReceivers() {
        return redisTemplate.opsForList().range("letter:recent:receivers", 0, -1)
                .stream().map(Object::toString).toList();
    }

    public void removeReceiver(Long memberId) {
        redisTemplate.opsForSet().remove(KEY, memberId.toString());
    }
}
