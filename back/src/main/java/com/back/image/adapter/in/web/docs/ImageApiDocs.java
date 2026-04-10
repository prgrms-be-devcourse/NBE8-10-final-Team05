package com.back.image.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.image.adapter.in.web.dto.ImageUploadResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.multipart.MultipartFile;

@Tag(
    name = "이미지",
    description =
        "에디터/일기에서 사용하는 이미지 업로드 및 삭제 API입니다. 업로드 성공 시 접근 가능한 `imageUrl`을 반환합니다.")
public interface ImageApiDocs {

  @Operation(
      summary = "이미지 업로드",
      description =
          "단일 이미지 파일을 업로드합니다. 현재 구현상 업로드 분류는 `DIARY`로 고정되어 있으며, 비로그인 상태에서도 업로드할 수 있습니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "업로드 성공"),
    @ApiResponse(responseCode = "400", description = "파일 형식 또는 크기 제한 위반")
  })
  RsData<ImageUploadResponse> uploadFile(
      @Parameter(description = "업로드할 이미지 파일") MultipartFile file);

  @Operation(
      summary = "이미지 삭제",
      description = "이미지 접근 URL을 기준으로 저장소에서 이미지를 삭제합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "삭제 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<Void> deleteFile(@Parameter(description = "삭제할 이미지의 접근 URL") String url);
}
