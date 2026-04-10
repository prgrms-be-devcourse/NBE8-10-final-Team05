package com.back.diary.adapter.in.web.docs;

import com.back.diary.adapter.application.port.in.dto.DiaryCreateReq;
import com.back.diary.adapter.application.port.in.dto.DiaryRes;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

@Tag(
    name = "일기",
    description =
        "감정 기록용 일기를 작성, 수정, 조회하는 API입니다. "
            + "작성/수정은 `multipart/form-data` 형식이며, `data` 파트에 JSON, `image` 파트에 첨부 파일을 전달합니다.")
public interface DiaryApiDocs {

  @Operation(
      summary = "일기 작성",
      description =
          "새 일기를 작성합니다. `data` 파트에는 `title`, `content`, `categoryName`, `isPrivate`, `imageUrl` 필드를 담은 JSON을 전달하고, "
              + "`image` 파트에는 선택적으로 업로드할 이미지 파일을 첨부합니다. 예시 data 파트: "
              + "`{\"title\":\"오늘의 기록\",\"content\":\"마음이 조금 진정됐다.\",\"categoryName\":\"WORRY\",\"isPrivate\":false,\"imageUrl\":\"\"}`")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "작성 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<Long> create(
      @Parameter(description = "일기 메타데이터 JSON 파트") DiaryCreateReq req,
      @Parameter(description = "선택 이미지 파일") MultipartFile image,
      @Parameter(hidden = true) AuthenticatedMember authenticatedMember);

  @Operation(
      summary = "공개 일기 목록 조회",
      description =
          "공개 허용된 일기 목록을 최신순으로 조회합니다. "
              + "현재 보안 정책상 이 API도 로그인 후 사용할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<Page<DiaryRes>> getPublicList(
      @Parameter(description = "페이지네이션 정보") Pageable pageable);

  @Operation(
      summary = "일기 단건 조회",
      description = "특정 일기의 상세 내용을 조회합니다. 비공개 일기는 본인만 확인할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "비공개 일기 접근 불가"),
    @ApiResponse(responseCode = "404", description = "일기 없음")
  })
  RsData<DiaryRes> getOne(
      @Parameter(description = "일기 ID") Long id,
      @Parameter(hidden = true) AuthenticatedMember authenticatedMember);

  @Operation(
      summary = "내 일기 목록 조회",
      description = "현재 로그인한 사용자의 일기 목록을 최신순으로 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  RsData<Page<DiaryRes>> getMyList(
      @Parameter(hidden = true) AuthenticatedMember authenticatedMember,
      @Parameter(description = "페이지네이션 정보") Pageable pageable);

  @Operation(
      summary = "일기 수정",
      description =
          "기존 일기를 수정합니다. 작성과 동일하게 `multipart/form-data` 형식이며 `data` JSON과 선택 `image` 파일을 함께 전달할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "수정 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "작성자만 수정 가능")
  })
  RsData<Void> modify(
      @Parameter(description = "수정할 일기 ID") Long id,
      @Parameter(description = "수정할 일기 메타데이터 JSON 파트") DiaryCreateReq req,
      @Parameter(description = "새 이미지 파일. 생략 가능") MultipartFile image,
      @Parameter(hidden = true) AuthenticatedMember authenticatedMember);

  @Operation(
      summary = "일기 삭제",
      description = "작성자 본인이 자신의 일기를 삭제합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "삭제 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "작성자만 삭제 가능")
  })
  RsData<Void> delete(
      @Parameter(description = "삭제할 일기 ID") Long id,
      @Parameter(hidden = true) AuthenticatedMember authenticatedMember);
}
