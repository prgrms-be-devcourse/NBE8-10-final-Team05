package com.back.censorship.adapter.in.web.dto;


public record AuditAiRequest(
        String content,
        String type // Letter, Post
) {}
