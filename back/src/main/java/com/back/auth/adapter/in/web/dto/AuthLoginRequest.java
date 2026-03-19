package com.back.auth.adapter.in.web.dto;

/** 로그인 요청 DTO. */
public record AuthLoginRequest(String email, String password) {}
