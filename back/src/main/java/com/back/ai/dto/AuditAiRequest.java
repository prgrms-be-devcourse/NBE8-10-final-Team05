package com.back.ai.dto;


public record AuditAiRequest(
        String content,
        String type // Letter, Post
) {}
