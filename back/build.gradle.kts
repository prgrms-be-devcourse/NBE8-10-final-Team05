plugins {
    java
    id("com.diffplug.spotless") version "8.3.0"
    id("org.springframework.boot") version "4.0.3"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com"
version = "0.0.1-SNAPSHOT"
description = "back"
val testcontainersVersion = "1.21.4"
val jwtVersion = "0.12.7"
val postgresqlVersion = "42.7.10"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot 핵심 스타터
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation ("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.0")
    implementation("io.micrometer:micrometer-registry-prometheus")

    // GEMINI
    implementation("com.google.genai:google-genai:1.0.0")
    implementation ("com.fasterxml.jackson.core:jackson-databind")
    implementation("io.github.cdimascio:dotenv-java:3.0.0")

    // JWT (토큰 생성/검증)
    implementation("io.jsonwebtoken:jjwt-api:$jwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:$jwtVersion")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jwtVersion")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // dev 전용
    developmentOnly("org.springframework.boot:spring-boot-devtools")
    developmentOnly("org.springframework.boot:spring-boot-docker-compose")

    // DB 드라이버
    runtimeOnly("org.postgresql:postgresql:$postgresqlVersion")

    // 테스트: 스프링
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")

    // Test
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter:$testcontainersVersion")
    testImplementation("org.testcontainers:postgresql:$testcontainersVersion")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    //Redis
    implementation ("org.springframework.boot:spring-boot-starter-data-redis")

    // AWS S3 (prod 이미지 스토리지)
    implementation("software.amazon.awssdk:s3:2.33.5")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

spotless {
    java {
        target("src/*/java/**/*.java")
        googleJavaFormat("1.35.0")
        importOrder()
        removeUnusedImports()
        trimTrailingWhitespace()
        endWithNewline()
    }
}
