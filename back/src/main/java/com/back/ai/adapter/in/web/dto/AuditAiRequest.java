package com.back.ai.adapter.in.web.dto;


public record AuditAiRequest(
        String content,
        String type // Letter, Post
) {}
