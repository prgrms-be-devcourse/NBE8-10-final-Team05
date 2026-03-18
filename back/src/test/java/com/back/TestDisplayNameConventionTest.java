package com.back;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("테스트 DisplayName 규칙 검증")
class TestDisplayNameConventionTest {

  private static final Path TEST_SOURCE_ROOT = Paths.get("src/test/java");
  private static final Pattern TEST_METHOD_ANNOTATION_PATTERN =
      Pattern.compile("^@(Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)(\\b|\\()");
  private static final Pattern CLASS_DECLARATION_PATTERN =
      Pattern.compile("^(public\\s+|protected\\s+|private\\s+)?(abstract\\s+|final\\s+)?class\\s+\\w+.*");

  @Test
  @DisplayName("모든 테스트 클래스에는 @DisplayName이 있어야 한다")
  void allTestClassesMustHaveDisplayName() throws IOException {
    List<String> violations = new ArrayList<>();

    for (Path file : listTestSourceFiles()) {
      List<String> lines = Files.readAllLines(file);
      if (!containsAnyTestMethod(lines)) {
        continue;
      }

      int classLine = findClassDeclarationLine(lines);
      if (classLine < 0) {
        continue;
      }

      if (!hasDisplayNameAnnotationAbove(lines, classLine)) {
        violations.add(file + ":" + (classLine + 1));
      }
    }

    assertThat(violations)
        .as("테스트 클래스 @DisplayName 누락: %s", String.join(", ", violations))
        .isEmpty();
  }

  @Test
  @DisplayName("모든 테스트 메서드에는 @DisplayName이 있어야 한다")
  void allTestMethodsMustHaveDisplayName() throws IOException {
    List<String> violations = new ArrayList<>();

    for (Path file : listTestSourceFiles()) {
      List<String> lines = Files.readAllLines(file);

      for (int i = 0; i < lines.size(); i++) {
        String trimmed = lines.get(i).trim();
        if (isTestMethodAnnotation(trimmed) && !hasDisplayNameAroundAnnotation(lines, i)) {
          violations.add(file + ":" + (i + 1));
        }
      }
    }

    assertThat(violations)
        .as("테스트 메서드 @DisplayName 누락: %s", String.join(", ", violations))
        .isEmpty();
  }

  private static List<Path> listTestSourceFiles() throws IOException {
    try (Stream<Path> stream = Files.walk(TEST_SOURCE_ROOT)) {
      return stream.filter(path -> path.toString().endsWith(".java")).sorted().toList();
    }
  }

  private static boolean containsAnyTestMethod(List<String> lines) {
    return lines.stream().map(String::trim).anyMatch(TestDisplayNameConventionTest::isTestMethodAnnotation);
  }

  private static int findClassDeclarationLine(List<String> lines) {
    for (int i = 0; i < lines.size(); i++) {
      String trimmed = lines.get(i).trim();
      if (CLASS_DECLARATION_PATTERN.matcher(trimmed).matches()) {
        return i;
      }
    }
    return -1;
  }

  private static boolean isTestMethodAnnotation(String trimmedLine) {
    return TEST_METHOD_ANNOTATION_PATTERN.matcher(trimmedLine).find();
  }

  private static boolean hasDisplayNameAnnotationAbove(List<String> lines, int lineIndex) {
    for (int i = lineIndex - 1; i >= 0; i--) {
      String trimmed = lines.get(i).trim();
      if (trimmed.isBlank() || trimmed.startsWith("//")) {
        continue;
      }
      if (trimmed.startsWith("@DisplayName(")) {
        return true;
      }
      if (trimmed.startsWith("@")) {
        continue;
      }
      return false;
    }
    return false;
  }

  private static boolean hasDisplayNameAroundAnnotation(List<String> lines, int annotationLine) {
    if (hasDisplayNameAnnotationAbove(lines, annotationLine)) {
      return true;
    }

    for (int i = annotationLine + 1; i < lines.size(); i++) {
      String trimmed = lines.get(i).trim();
      if (trimmed.isBlank() || trimmed.startsWith("//")) {
        continue;
      }
      if (trimmed.startsWith("@DisplayName(")) {
        return true;
      }
      if (trimmed.startsWith("@")) {
        continue;
      }
      return false;
    }
    return false;
  }
}
