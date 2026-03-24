package com.back.global.config;

import com.google.api.client.util.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${custom.file.upload-dir}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // /gen/** 로 시작하는 요청이 오면 실제 로컬 폴더에서 파일을 찾음
        registry.addResourceHandler("/gen/**")
                .addResourceLocations("file:///" + uploadDir + "/");
    }
}
