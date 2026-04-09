package com.back.member.adapter.in.web.dto;

public record AdminUpdateMemberStatusRequest(String status, String reason, Boolean revokeSessions) {}
