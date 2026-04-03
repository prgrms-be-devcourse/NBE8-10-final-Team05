package com.back.global.seed;

import com.back.comment.repository.CommentRepository;
import com.back.diary.adapter.out.persistence.repository.DiaryRepository;
import com.back.diary.domain.Diary;
import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostResolutionStatus;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import com.back.report.adapter.out.persistence.ReportRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"k6", "k6-cloud"})
@RequiredArgsConstructor
public class K6SeedService implements ApplicationRunner {

  private static final String FIXED_USER_PASSWORD = "Maumon!2026#LoadTest";
  private static final String FIXED_ADMIN_PASSWORD = "Maumon!2026#LoadTest";

  private static final String SEED_POST_PREFIX = "[K6-SEED-POST]";
  private static final String SEED_DIARY_PREFIX = "[K6-SEED-DIARY]";
  private static final String SEED_LETTER_PREFIX = "[K6-SEED-LETTER]";

  private static final String RUNTIME_POST_PREFIX = "k6-post-";
  private static final String RUNTIME_POST_UPDATED_PREFIX = "k6-post-updated-";
  private static final String RUNTIME_DIARY_PREFIX = "k6-diary-";
  private static final String RUNTIME_DIARY_UPDATED_PREFIX = "k6-diary-updated-";
  private static final String RUNTIME_LETTER_PREFIX = "k6-letter-";
  private static final String RUNTIME_REPORT_PREFIX = "k6 report sample";

  private final MemberRepository memberRepository;
  private final CommentRepository commentRepository;
  private final PostRepository postRepository;
  private final DiaryRepository diaryRepository;
  private final LetterRepository letterRepository;
  private final ReportRepository reportRepository;
  private final PasswordEncoder passwordEncoder;

  @Value("${k6.seed.user-count:500}")
  private int userCount;

  @Value("${k6.seed.admin-count:3}")
  private int adminCount;

  @Value("${k6.seed.user-prefix:k6-user}")
  private String userPrefix;

  @Value("${k6.seed.user-domain:k6.maumon.local}")
  private String userDomain;

  @Value("${k6.seed.admin-prefix:k6-admin}")
  private String adminPrefix;

  @Value("${k6.seed.admin-domain:admin.maumon.local}")
  private String adminDomain;

  @Value("${k6.seed.post-count:3000}")
  private int postCount;

  @Value("${k6.seed.diary-count:1000}")
  private int diaryCount;

  @Value("${k6.seed.letter-count:1000}")
  private int letterCount;

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    seed();
  }

  @Transactional
  public void reset() {
    cleanupLoadtestData();
    seed();
  }

  @Transactional
  public void seed() {
    ensureMembers();
    ensureAdmins();
    seedPosts();
    seedDiaries();
    seedLetters();
  }

  private void ensureMembers() {
    for (int i = 1; i <= userCount; i++) {
      String email = formatEmail(userPrefix, userDomain, i);
      String nickname = "K6유저" + String.format("%04d", i);
      ensureAccount(email, nickname, MemberRole.USER, FIXED_USER_PASSWORD);
    }
  }

  private void ensureAdmins() {
    for (int i = 1; i <= adminCount; i++) {
      String email = formatEmail(adminPrefix, adminDomain, i);
      String nickname = "K6관리자" + String.format("%04d", i);
      ensureAccount(email, nickname, MemberRole.ADMIN, FIXED_ADMIN_PASSWORD);
    }
  }

  private void ensureAccount(String email, String nickname, MemberRole role, String rawPassword) {
    String encodedPassword = passwordEncoder.encode(rawPassword);

    memberRepository
        .findByEmail(email)
        .ifPresentOrElse(
            member -> {
              member.updateNickname(nickname);
              member.updateRole(role);
              member.updateStatus(MemberStatus.ACTIVE);
              member.updatePasswordHash(encodedPassword);
              member.updateRandomReceiveAllowed(true);
            },
            () -> {
              Member created = Member.create(email, encodedPassword, nickname);
              created.updateRole(role);
              created.updateStatus(MemberStatus.ACTIVE);
              created.updateRandomReceiveAllowed(true);
              memberRepository.save(created);
            });
  }

  private void seedPosts() {
    long existing = postRepository.countByTitleStartingWith(SEED_POST_PREFIX);
    if (existing >= postCount) {
      return;
    }

    List<Member> users = getK6Members();
    if (users.isEmpty()) {
      return;
    }

    PostCategory[] categories = PostCategory.values();
    for (long i = existing + 1; i <= postCount; i++) {
      Member writer = users.get((int) ((i - 1) % users.size()));
      PostCategory category = categories[(int) ((i - 1) % categories.length)];
      String title = SEED_POST_PREFIX + "-" + i;
      String content = "k6 seed post content " + i;

      Post post =
          Post.builder()
              .title(title)
              .content(content)
              .summary(content)
              .status(PostStatus.PUBLISHED)
              .member(writer)
              .category(category)
              .resolutionStatus(PostResolutionStatus.ONGOING)
              .build();
      postRepository.save(post);
    }
  }

  private void seedDiaries() {
    long existing = diaryRepository.countByTitleStartingWith(SEED_DIARY_PREFIX);
    if (existing >= diaryCount) {
      return;
    }

    List<Member> users = getK6Members();
    if (users.isEmpty()) {
      return;
    }

    String[] categories = {"일상", "고민", "질문"};
    for (long i = existing + 1; i <= diaryCount; i++) {
      Member writer = users.get((int) ((i - 1) % users.size()));
      Diary diary =
          Diary.builder()
              .memberId(writer.getId())
              .nickname(writer.getNickname())
              .title(SEED_DIARY_PREFIX + "-" + i)
              .content("k6 seed diary content " + i)
              .categoryName(categories[(int) ((i - 1) % categories.length)])
              .isPrivate(i % 3 != 0)
              .build();
      diaryRepository.save(diary);
    }
  }

  private void seedLetters() {
    long existing = letterRepository.countByTitleStartingWith(SEED_LETTER_PREFIX);
    if (existing >= letterCount) {
      return;
    }

    List<Member> users = getK6Members();
    if (users.size() < 2) {
      return;
    }

    for (long i = existing + 1; i <= letterCount; i++) {
      int senderIndex = (int) ((i - 1) % users.size());
      int receiverIndex = (senderIndex + 1) % users.size();
      Member sender = users.get(senderIndex);
      Member receiver = users.get(receiverIndex);

      Letter letter =
          Letter.builder()
              .title(SEED_LETTER_PREFIX + "-" + i)
              .content("k6 seed letter content " + i)
              .sender(sender)
              .receiver(receiver)
              .status(LetterStatus.SENT)
              .build();
      letterRepository.save(letter);
    }
  }

  private List<Member> getK6Members() {
    List<Member> members = new ArrayList<>(userCount);
    for (int i = 1; i <= userCount; i++) {
      String email = formatEmail(userPrefix, userDomain, i);
      memberRepository.findByEmail(email).ifPresent(members::add);
    }
    return members;
  }

  private void cleanupLoadtestData() {
    commentRepository.deleteByPostTitleStartingWith(RUNTIME_POST_PREFIX);
    commentRepository.deleteByPostTitleStartingWith(RUNTIME_POST_UPDATED_PREFIX);
    commentRepository.deleteByPostTitleStartingWith(SEED_POST_PREFIX);

    postRepository.deleteByTitleStartingWith(RUNTIME_POST_PREFIX);
    postRepository.deleteByTitleStartingWith(RUNTIME_POST_UPDATED_PREFIX);
    postRepository.deleteByTitleStartingWith(SEED_POST_PREFIX);

    diaryRepository.deleteByTitleStartingWith(RUNTIME_DIARY_PREFIX);
    diaryRepository.deleteByTitleStartingWith(RUNTIME_DIARY_UPDATED_PREFIX);
    diaryRepository.deleteByTitleStartingWith(SEED_DIARY_PREFIX);

    letterRepository.deleteByTitleStartingWith(RUNTIME_LETTER_PREFIX);
    letterRepository.deleteByTitleStartingWith(SEED_LETTER_PREFIX);

    reportRepository.deleteByContentStartingWith(RUNTIME_REPORT_PREFIX);
  }

  private String formatEmail(String prefix, String domain, int index) {
    return prefix + "-" + String.format("%04d", index) + "@" + domain;
  }
}
