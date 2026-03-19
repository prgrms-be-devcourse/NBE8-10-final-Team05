package com.back.auth.adapter.in.web.dto;

/** 회원 가입 요청 DTO. */
public record AuthSignupRequest(String email, String password, String nickname) {}
