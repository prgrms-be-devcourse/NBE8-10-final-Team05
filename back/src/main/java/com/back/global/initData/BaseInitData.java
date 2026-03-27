package com.back.global.initData;

import com.back.letter.adapter.out.persistence.repository.LetterRepository;
import com.back.letter.domain.Letter;
import com.back.letter.domain.LetterStatus;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRole;
import com.back.member.domain.MemberStatus;
import com.back.member.domain.MemberRepository;
import com.back.post.entity.Post;
import com.back.post.entity.PostCategory;
import com.back.post.entity.PostStatus;
import com.back.post.repository.PostRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Transactional
public class BaseInitData implements ApplicationRunner {

  private static final String DEV_PASSWORD = "dev1234!";
  private static final String DEV_ADMIN_EMAIL = "admin@admin.com";
  private static final String DEV_ADMIN_PASSWORD = "admin";
  private static final String DEV_ADMIN_NICKNAME = "관리자";

  private final MemberRepository memberRepository;
  private final PostRepository postRepository;
  private final LetterRepository letterRepository;
  private final PasswordEncoder passwordEncoder;

  @Override
  public void run(ApplicationArguments args) {
    ensureAdminMember();

    Member devMemberA = ensureMember("dev1@maumon.local", "마음온_하늘");
    Member devMemberB = ensureMember("dev2@maumon.local", "마음온_바다");
    Member devMemberC = ensureMember("dev3@maumon.local", "마음온_숲");

    seedSamplePosts(devMemberA, devMemberB, devMemberC);
    seedSampleLetters(devMemberA, devMemberB, devMemberC);
  }

  private Member ensureMember(String email, String nickname) {
    return memberRepository
        .findByEmail(email)
        .orElseGet(
            () ->
                memberRepository.save(
                    Member.create(email, passwordEncoder.encode(DEV_PASSWORD), nickname)));
  }

  private Member ensureAdminMember() {
    return memberRepository
        .findByEmail(DEV_ADMIN_EMAIL)
        .map(
            member -> {
              member.updateNickname(DEV_ADMIN_NICKNAME);
              member.updateRole(MemberRole.ADMIN);
              member.updateStatus(MemberStatus.ACTIVE);
              member.updatePasswordHash(passwordEncoder.encode(DEV_ADMIN_PASSWORD));
              return member;
            })
        .orElseGet(
            () -> {
              Member adminMember =
                  Member.create(
                      DEV_ADMIN_EMAIL,
                      passwordEncoder.encode(DEV_ADMIN_PASSWORD),
                      DEV_ADMIN_NICKNAME);
              adminMember.updateRole(MemberRole.ADMIN);
              adminMember.updateStatus(MemberStatus.ACTIVE);
              return memberRepository.save(adminMember);
            });
  }

  private void seedSamplePosts(Member memberA, Member memberB, Member memberC) {
    List<Post> samplePosts =
        List.of(
            Post.builder()
                .title("요즘 마음이 자주 흔들려요")
                .content("하루를 잘 보내도 밤이 되면 생각이 많아져요. 비슷한 경험이 있으면 조언 부탁드려요.")
                .summary("하루를 잘 보내도 밤이 되면 생각이 많아져요. 비슷한 경험이 있으면 조언 부탁드려요.")
                .member(memberA)
                .category(PostCategory.WORRY)
                .status(PostStatus.PUBLISHED)
                .viewCount(23)
                .build(),
            Post.builder()
                .title("일상 루틴이 자꾸 무너질 때")
                .content("규칙적으로 생활하고 싶은데 이틀 정도 지나면 다시 흐트러져요. 작은 팁이 있을까요?")
                .summary("규칙적으로 생활하고 싶은데 이틀 정도 지나면 다시 흐트러져요. 작은 팁이 있을까요?")
                .member(memberB)
                .category(PostCategory.DAILY)
                .status(PostStatus.PUBLISHED)
                .viewCount(15)
                .build(),
            Post.builder()
                .title("면접 준비, 어디부터 정리하면 좋을까요?")
                .content("경력 정리는 했는데 예상 질문 대비가 막막해요. 준비 순서 추천 부탁드립니다.")
                .summary("경력 정리는 했는데 예상 질문 대비가 막막해요. 준비 순서 추천 부탁드립니다.")
                .member(memberC)
                .category(PostCategory.QUESTION)
                .status(PostStatus.PUBLISHED)
                .viewCount(31)
                .build(),
            Post.builder()
                .title("사소한 말에 오래 마음이 남는 편이에요")
                .content("괜찮다고 넘기고 싶은데 계속 생각이 돌아요. 마음 정리법이 궁금해요.")
                .summary("괜찮다고 넘기고 싶은데 계속 생각이 돌아요. 마음 정리법이 궁금해요.")
                .member(memberA)
                .category(PostCategory.WORRY)
                .status(PostStatus.PUBLISHED)
                .viewCount(18)
                .build(),
            Post.builder()
                .title("퇴근 후 한 시간, 어떻게 쓰시나요?")
                .content("핸드폰만 보다 하루가 끝나서 아쉬워요. 짧게라도 의미 있게 보내는 방법이 궁금해요.")
                .summary("핸드폰만 보다 하루가 끝나서 아쉬워요. 짧게라도 의미 있게 보내는 방법이 궁금해요.")
                .member(memberB)
                .category(PostCategory.DAILY)
                .status(PostStatus.PUBLISHED)
                .viewCount(11)
                .build(),
            Post.builder()
                .title("작은 성취를 기록하는 습관이 도움이 될까요?")
                .content("하루에 한 줄이라도 잘한 일을 남겨보려는데 오래 유지할 수 있는 방법이 궁금해요.")
                .summary("하루에 한 줄이라도 잘한 일을 남겨보려는데 오래 유지할 수 있는 방법이 궁금해요.")
                .member(memberC)
                .category(PostCategory.QUESTION)
                .status(PostStatus.PUBLISHED)
                .viewCount(7)
                .build(),
            Post.builder()
                .title("주말에 혼자 쉬어도 괜찮다는 확신이 필요해요")
                .content("사람들을 만나지 않으면 괜히 뒤처지는 기분이 드는데, 혼자 쉬는 시간을 더 편하게 받아들이고 싶어요.")
                .summary("사람들을 만나지 않으면 괜히 뒤처지는 기분이 드는데, 혼자 쉬는 시간을 더 편하게 받아들이고 싶어요.")
                .member(memberA)
                .category(PostCategory.WORRY)
                .status(PostStatus.PUBLISHED)
                .viewCount(29)
                .build(),
            Post.builder()
                .title("출근 전 10분 정리 루틴 공유해요")
                .content("물 한 잔, 오늘 할 일 세 가지 적기, 스트레칭 순서로 시작했더니 오전이 훨씬 덜 급해졌어요.")
                .summary("물 한 잔, 오늘 할 일 세 가지 적기, 스트레칭 순서로 시작했더니 오전이 훨씬 덜 급해졌어요.")
                .member(memberB)
                .category(PostCategory.DAILY)
                .status(PostStatus.PUBLISHED)
                .viewCount(13)
                .build(),
            Post.builder()
                .title("상대에게 조심스럽게 거절 의사를 전하는 법")
                .content("관계를 해치지 않으면서도 분명하게 선을 긋고 싶을 때 어떤 표현이 가장 좋을까요?")
                .summary("관계를 해치지 않으면서도 분명하게 선을 긋고 싶을 때 어떤 표현이 가장 좋을까요?")
                .member(memberC)
                .category(PostCategory.QUESTION)
                .status(PostStatus.PUBLISHED)
                .viewCount(22)
                .build());

    samplePosts.stream()
        .filter(post -> !postRepository.existsByTitle(post.getTitle()))
        .forEach(postRepository::save);
  }

  private void seedSampleLetters(Member memberA, Member memberB, Member memberC) {
    LocalDateTime now = LocalDateTime.now();

    List<Letter> sampleLetters =
        List.of(
            Letter.builder()
                .title("오늘 하루가 유난히 길게 느껴졌어요")
                .content("별일은 없었는데 마음이 지치네요. 잠깐이라도 괜찮아지는 방법이 있을까요?")
                .sender(memberA)
                .receiver(memberB)
                .status(LetterStatus.SENT)
                .build(),
            Letter.builder()
                .title("결정 앞에서 자꾸 망설이게 돼요")
                .content("작은 선택도 오래 고민하게 됩니다. 기준을 세우는 방법이 궁금해요.")
                .replyContent("완벽한 답을 찾기보다, 지금 가장 중요한 한 가지를 먼저 정해보면 마음이 덜 흔들려요.")
                .sender(memberB)
                .receiver(memberC)
                .status(LetterStatus.REPLIED)
                .replyCreatedDate(now.minusHours(4))
                .build(),
            Letter.builder()
                .title("요즘 관계가 조금 어색해졌어요")
                .content("가까웠던 친구랑 대화가 줄었어요. 먼저 연락해도 괜찮을지 고민됩니다.")
                .sender(memberC)
                .receiver(memberA)
                .status(LetterStatus.ACCEPTED)
                .build(),
            Letter.builder()
                .title("답장을 쓰다 말고 멈춰 있었어요")
                .content("어떻게 위로를 전하면 좋을지 고민하다가 문장만 몇 번 지웠네요.")
                .sender(memberA)
                .receiver(memberC)
                .status(LetterStatus.WRITING)
                .build(),
            Letter.builder()
                .title("요즘 잠드는 시간이 자꾸 밀려요")
                .content("하루를 정리하고 눕는데도 생각이 많아서 늦게 자게 됩니다. 루틴을 바꾸면 나아질까요?")
                .replyContent("잠들기 직전에는 해결하려는 생각보다 오늘 멈출 생각을 정해두는 쪽이 도움이 될 수 있어요.")
                .sender(memberB)
                .receiver(memberA)
                .status(LetterStatus.REPLIED)
                .replyCreatedDate(now.minusHours(1))
                .build());

    sampleLetters.stream()
        .filter(letter -> !letterRepository.existsByTitle(letter.getTitle()))
        .forEach(letterRepository::save);
  }
}
