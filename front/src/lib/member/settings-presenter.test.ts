import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/rs-data";
import {
  getEmailSavedNotice,
  getNicknameSavedNotice,
  getPasswordSavedNotice,
  getRandomReceiveDescription,
  getRandomReceiveToggleNotice,
  getWithdrawNotice,
  toMemberSettingsErrorMessage,
} from "./settings-presenter";

describe("settings-presenter", () => {
  it("이메일 저장 완료 문구를 반환한다", () => {
    expect(getEmailSavedNotice()).toBe("이메일을 변경했어요.");
  });

  it("닉네임 저장 완료 문구를 반환한다", () => {
    expect(getNicknameSavedNotice()).toBe("닉네임을 저장했어요.");
  });

  it("비밀번호 저장 완료 문구를 반환한다", () => {
    expect(getPasswordSavedNotice()).toBe("비밀번호를 변경했어요.");
  });

  it("회원 탈퇴 완료 문구를 반환한다", () => {
    expect(getWithdrawNotice()).toBe("회원 탈퇴가 완료되었어요.");
  });

  it("랜덤 편지 수신 상태별 안내 문구를 반환한다", () => {
    expect(getRandomReceiveDescription(true)).toBe(
      "새로운 랜덤 편지를 받을 수 있어요.",
    );
    expect(getRandomReceiveDescription(false)).toBe(
      "랜덤 편지 수신이 꺼져 있어요.",
    );
  });

  it("랜덤 편지 수신 토글 완료 문구를 반환한다", () => {
    expect(getRandomReceiveToggleNotice(true)).toBe(
      "이제 랜덤 편지를 받을 수 있어요.",
    );
    expect(getRandomReceiveToggleNotice(false)).toBe(
      "랜덤 편지 수신을 잠시 껐어요.",
    );
  });

  it("401과 403 오류는 사용자 친화 문구로 변환한다", () => {
    expect(
      toMemberSettingsErrorMessage(
        new ApiError("Authentication is required.", 401, "401-1"),
      ),
    ).toBe("로그인이 필요한 기능이에요. 로그인 후 다시 시도해 주세요.");

    expect(
      toMemberSettingsErrorMessage(
        new ApiError("You do not have permission.", 403, "403-1"),
      ),
    ).toBe("이 요청을 수행할 권한이 없어요.");

    expect(
      toMemberSettingsErrorMessage(
        new ApiError("Current password is invalid.", 401, "401-2"),
      ),
    ).toBe("현재 비밀번호가 맞지 않아요.");
  });

  it("중복 이메일 오류는 전용 문구로 변환한다", () => {
    expect(
      toMemberSettingsErrorMessage(
        new ApiError("Member email already exists.", 409, "409-1"),
      ),
    ).toBe("이미 사용 중인 이메일이에요. 다른 이메일을 입력해 주세요.");
  });

  it("기타 오류는 기본 오류 문구 변환을 따른다", () => {
    expect(
      toMemberSettingsErrorMessage(
        new ApiError("Unexpected server error.", 500, "500-1"),
      ),
    ).toBe("서버에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
  });
});
