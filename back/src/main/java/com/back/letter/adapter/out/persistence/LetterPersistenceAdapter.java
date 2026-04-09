package com.back.letter.adapter.out.persistence;

import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.letter.application.port.out.LetterPort;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LetterPersistenceAdapter implements LetterPort {

    private final LetterRepository letterRepository;

    @Override
    public Letter save(Letter letter) {
        return letterRepository.save(letter);
    }

    @Override
    public Optional<Letter> findById(long id) {
        return letterRepository.findById(id);
    }

    @Override
    public Optional<Letter> findByIdForAdmin(long id) {
        return letterRepository.findByIdForAdmin(id);
    }

    @Override
    public Page<Letter> findAdminLetters(LetterStatus status, boolean onlyUnassigned, Pageable pageable) {
        return letterRepository.findAdminLetters(status, onlyUnassigned, pageable);
    }

    @Override
    public Page<Letter> searchAdminLetters(String query, LetterStatus status, boolean onlyUnassigned, Pageable pageable) {
        return letterRepository.searchAdminLetters(query, status, onlyUnassigned, pageable);
    }

    @Override
    public Page<Letter> findByReceiverId(long memberId, Pageable pageable) {
        return letterRepository.findByReceiverId(memberId, pageable);
    }

    @Override
    public Page<Letter> findBySenderId(long memberId, Pageable pageable) {
        return letterRepository.findBySenderId(memberId, pageable);
    }

    @Override
    public Optional<Member> findRandomMemberExceptMe(List<Long> excludeIds) {
        return letterRepository.findRandomMemberExceptMe(excludeIds);
    }
    @Override
    public Optional<Letter> findLatestReceived(Long receiverId) {
        return letterRepository.findFirstByReceiverIdOrderByCreateDateDesc(receiverId);
    }

    @Override
    public Optional<Letter> findLatestSent(Long senderId) {
        return letterRepository.findFirstBySenderIdOrderByCreateDateDesc(senderId);
    }
    @Override
    public long countByReceiverId(Long receiverId) {
        return letterRepository.countByReceiverId(receiverId);
    }

    @Override
    public List<Letter> findUnreadLettersExceeding(LocalDateTime expirationTime) {
        return letterRepository.findUnreadLettersExceeding(expirationTime);
    }
}
