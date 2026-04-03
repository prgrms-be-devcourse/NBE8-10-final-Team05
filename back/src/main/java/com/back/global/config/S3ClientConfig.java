package com.back.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
@Profile("prod")
public class S3ClientConfig {

  @Bean
  public S3Client s3Client(@Value("${custom.file.storage.s3.region}") String region) {
    return S3Client.builder().region(Region.of(region)).build();
  }
}
