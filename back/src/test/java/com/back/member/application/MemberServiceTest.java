package com.back.member.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.back.member.adapter.in.web.dto.CreateMemberRequest;
import com.back.member.domain.Member;
import com.back.member.domain.MemberRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

  @Mock private MemberRepository memberRepository;
  @Mock private PasswordEncoder passwordEncoder;

  @InjectMocks private MemberService memberService;

  @Test
  void createMemberStoresPasswordHashOnly() {
    String rawPassword = "plain-password";
    String passwordHash = "$2a$10$hashValue";
    CreateMemberRequest request =
        new CreateMemberRequest("member1@test.com", rawPassword, "member1");

    given(memberRepository.existsByEmail("member1@test.com")).willReturn(false);
    given(passwordEncoder.encode(rawPassword)).willReturn(passwordHash);
    given(memberRepository.save(any(Member.class))).willAnswer(invocation -> invocation.getArgument(0));

    memberService.createMember(request);

    ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
    then(memberRepository).should().save(captor.capture());
    Member saved = captor.getValue();

    assertThat(saved.getPasswordHash()).isEqualTo(passwordHash);
    assertThat(saved.getPasswordHash()).isNotEqualTo(rawPassword);
    then(passwordEncoder).should().encode(rawPassword);
  }

  @Test
  void passwordComparisonUsesPasswordEncoderMatches() {
    Member member = Member.create("member2@test.com", "$2a$10$hashValue", "member2");
    String rawPassword = "plain-password";

    given(passwordEncoder.matches(rawPassword, "$2a$10$hashValue")).willReturn(true);

    boolean result = member.matchesPassword(rawPassword, passwordEncoder);

    assertThat(result).isTrue();
    then(passwordEncoder).should().matches(rawPassword, "$2a$10$hashValue");
  }
}
