import { describe, expect, it } from "vitest";
import {
  formatMonitoringBasePath,
  getAdminMemberStatusLabel,
  getAdminRoleLabel,
  getMonitoringPrimaryActionLabel,
  getMonitoringStatusDescription,
  getMonitoringStatusLabel,
} from "./admin-settings-presenter";

describe("admin-settings-presenter", () => {
  it("관리자 역할 라벨을 사용자 친화 문구로 변환한다", () => {
    expect(getAdminRoleLabel("ADMIN")).toBe("전체 관리자");
    expect(getAdminRoleLabel("USER")).toBe("일반 회원");
    expect(getAdminRoleLabel("OPS")).toBe("OPS");
    expect(getAdminRoleLabel(undefined)).toBe("알 수 없음");
  });

  it("회원 상태 라벨을 사용자 친화 문구로 변환한다", () => {
    expect(getAdminMemberStatusLabel("ACTIVE")).toBe("활동 가능");
    expect(getAdminMemberStatusLabel("SUSPENDED")).toBe("이용 정지");
    expect(getAdminMemberStatusLabel("WITHDRAWN")).toBe("탈퇴 완료");
    expect(getAdminMemberStatusLabel(null)).toBe("확인 필요");
  });

  it("모니터링 상태별 라벨과 설명을 반환한다", () => {
    expect(getMonitoringStatusLabel("checking")).toBe("상태 확인 중");
    expect(getMonitoringStatusLabel("ready")).toBe("연결 준비 완료");
    expect(getMonitoringStatusLabel("login-required")).toBe("로그인 필요");
    expect(getMonitoringStatusLabel("unavailable")).toBe("연결 확인 필요");

    expect(getMonitoringStatusDescription("ready")).toContain("바로 열 수 있습니다");
    expect(getMonitoringStatusDescription("login-required")).toContain("로그인");
    expect(getMonitoringStatusDescription("unavailable")).toContain("점검");
  });

  it("모니터링 상태에 맞는 기본 액션 라벨을 반환한다", () => {
    expect(getMonitoringPrimaryActionLabel("login-required")).toBe(
      "Grafana 로그인",
    );
    expect(getMonitoringPrimaryActionLabel("ready")).toBe("Grafana 열기");
  });

  it("모니터링 베이스 경로가 비어 있으면 same-origin 문구를 사용한다", () => {
    expect(formatMonitoringBasePath("")).toBe("same-origin (/)");
    expect(formatMonitoringBasePath("/monitoring")).toBe("/monitoring");
  });
});
