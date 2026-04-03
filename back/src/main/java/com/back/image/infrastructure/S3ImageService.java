package com.back.image.infrastructure;

import com.back.global.exception.ServiceException;
import com.back.image.adapter.out.persistence.ImageRepository;
import com.back.image.application.service.ImageService;
import com.back.image.domain.Image;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
@Profile("prod")
@RequiredArgsConstructor
public class S3ImageService implements ImageService {

  @Value("${custom.file.storage.s3.bucket}")
  private String bucket;

  @Value("${custom.file.storage.s3.region}")
  private String region;

  @Value("${custom.file.storage.s3.prefix:maum-on}")
  private String keyPrefix;

  @Value("${custom.file.storage.s3.public-base-url:}")
  private String publicBaseUrl;

  private final S3Client s3Client;
  private final ImageRepository imageRepository;

  @Override
  @Transactional
  public Image upload(MultipartFile file, String refType) {
    if (file == null || file.isEmpty()) return null;

    String originName = file.getOriginalFilename();
    String ext = extractExt(originName);
    String storedName = ext.isBlank() ? UUID.randomUUID().toString() : UUID.randomUUID() + "." + ext;
    String objectKey = buildObjectKey(storedName);

    try {
      s3Client.putObject(
          PutObjectRequest.builder()
              .bucket(bucket)
              .key(objectKey)
              .contentType(file.getContentType())
              .build(),
          RequestBody.fromBytes(file.getBytes()));
    } catch (IOException e) {
      throw new ServiceException("500-1", "S3 파일 업로드 중 오류가 발생했습니다.");
    }

    Image image =
        Image.builder()
            .originName(originName)
            .storedName(storedName)
            .accessUrl(buildAccessUrl(objectKey))
            .extension(ext)
            .fileSize(file.getSize())
            .referenceType(refType)
            .build();

    return imageRepository.save(image);
  }

  @Override
  @Transactional
  public void delete(String fileUrl) {
    if (!StringUtils.hasText(fileUrl)) return;

    String storedName = extractStoredName(fileUrl);
    Optional<Image> imageOpt = imageRepository.findByStoredName(storedName);
    if (imageOpt.isEmpty()) return;

    try {
      s3Client.deleteObject(
          DeleteObjectRequest.builder().bucket(bucket).key(buildObjectKey(storedName)).build());
    } catch (Exception ignored) {
      // 원격 파일이 이미 삭제된 경우에도 DB 레코드는 정리한다.
    }

    imageRepository.delete(imageOpt.get());
  }

  private String buildObjectKey(String storedName) {
    String normalizedPrefix = StringUtils.trimTrailingCharacter(keyPrefix.trim(), '/');
    if (!StringUtils.hasText(normalizedPrefix)) return storedName;
    return normalizedPrefix + "/" + storedName;
  }

  private String buildAccessUrl(String objectKey) {
    if (StringUtils.hasText(publicBaseUrl)) {
      String normalizedBase = StringUtils.trimTrailingCharacter(publicBaseUrl.trim(), '/');
      return normalizedBase + "/" + urlEncodePath(objectKey);
    }

    return "https://"
        + bucket
        + ".s3."
        + region
        + ".amazonaws.com/"
        + urlEncodePath(objectKey);
  }

  private String urlEncodePath(String rawPath) {
    return URLEncoder.encode(rawPath, StandardCharsets.UTF_8).replace("+", "%20").replace("%2F", "/");
  }

  private String extractStoredName(String fileUrl) {
    String withoutQuery = fileUrl.split("\\?", 2)[0];
    int slash = withoutQuery.lastIndexOf('/');
    return slash >= 0 ? withoutQuery.substring(slash + 1) : withoutQuery;
  }

  private String extractExt(String fileName) {
    if (!StringUtils.hasText(fileName)) return "";
    int pos = fileName.lastIndexOf(".");
    return pos < 0 ? "" : fileName.substring(pos + 1);
  }
}
