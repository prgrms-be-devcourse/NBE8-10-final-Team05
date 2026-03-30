package com.back.member.adapter.in.web.dto;

/** 회원 비밀번호 변경 요청 DTO. */
public record UpdateMemberPasswordRequest(String currentPassword, String newPassword) {}
