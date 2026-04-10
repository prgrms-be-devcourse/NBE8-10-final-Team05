package com.back.post.controller.docs;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.post.dto.PostCreateReq;
import com.back.post.dto.PostInfoRes;
import com.back.post.dto.PostListRes;
import com.back.post.dto.PostResolutionStatusUpdateReq;
import com.back.post.dto.PostUpdateReq;
import com.back.post.entity.PostCategory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Slice;
import org.springframework.http.ResponseEntity;

@Tag(
    name = "게시글",
    description =
        "고민, 일상, 질문 카테고리의 게시글을 작성하고 조회하는 API입니다. "
            + "커뮤니티형 공감/상담 보조 흐름의 기본 데이터 소스로 사용됩니다.")
public interface PostApiDocs {

  @Operation(
      summary = "게시글 작성",
      description = "인증된 사용자가 게시글을 작성합니다. 작성자는 현재 access token의 사용자로 자동 결정됩니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "작성 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<Long>> createPost(
      @Parameter(hidden = true) AuthenticatedMember authMember,
      @RequestBody(
              required = true,
              description = "게시글 생성 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = PostCreateReq.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "title": "오늘 너무 불안했어요",
                                    "content": "비슷한 경험이 있는 분의 조언이 듣고 싶어요.",
                                    "thumbnail": null,
                                    "category": "WORRY"
                                  }
                                  """)))
          PostCreateReq request);

  @Operation(
      summary = "게시글 목록 조회",
      description =
          "제목 키워드와 카테고리로 게시글 목록을 조회합니다. "
              + "비로그인 사용자도 접근할 수 있는 공개 조회 API입니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공")
  })
  ResponseEntity<RsData<Slice<PostListRes>>> getPosts(
      @Parameter(description = "제목 검색어") String title,
      @Parameter(description = "카테고리 필터. `DAILY`, `WORRY`, `QUESTION`") PostCategory category,
      @Parameter(description = "페이지 번호, 0부터 시작") int page,
      @Parameter(description = "페이지 크기") int size);

  @Operation(
      summary = "게시글 상세 조회",
      description = "단일 게시글의 본문, 작성자, 댓글 수 등 상세 정보를 조회합니다.",
      security = {})
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "404", description = "게시글 없음")
  })
  ResponseEntity<RsData<PostInfoRes>> getPost(@Parameter(description = "게시글 ID") Long id);

  @Operation(
      summary = "게시글 수정",
      description = "작성자 본인만 게시글 내용을 수정할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "수정 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "작성자만 수정 가능")
  })
  ResponseEntity<RsData<Void>> updatePost(
      @Parameter(hidden = true) AuthenticatedMember authMember,
      @Parameter(description = "수정할 게시글 ID") Long id,
      @RequestBody(
              required = true,
              description = "게시글 수정 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = PostUpdateReq.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "title": "수정된 제목",
                                    "content": "수정된 본문입니다.",
                                    "thumbnail": null,
                                    "category": "QUESTION"
                                  }
                                  """)))
          PostUpdateReq request);

  @Operation(
      summary = "고민 해결 상태 변경",
      description =
          "고민 게시글의 해결 상태를 `ONGOING` 또는 `RESOLVED`로 변경합니다. "
              + "작성자가 자신의 고민이 해결되었는지 표시할 때 사용합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "상태 변경 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "작성자만 변경 가능")
  })
  ResponseEntity<RsData<Void>> updateResolutionStatus(
      @Parameter(hidden = true) AuthenticatedMember authMember,
      @Parameter(description = "게시글 ID") Long id,
      @RequestBody(
              required = true,
              description = "고민 해결 상태 변경 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = PostResolutionStatusUpdateReq.class),
                      examples = @ExampleObject(value = "{\"resolutionStatus\":\"RESOLVED\"}")))
          PostResolutionStatusUpdateReq request);

  @Operation(
      summary = "게시글 삭제",
      description = "작성자 본인이 자신의 게시글을 삭제합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "삭제 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "작성자만 삭제 가능")
  })
  ResponseEntity<RsData<Void>> deletePost(
      @Parameter(hidden = true) AuthenticatedMember authMember,
      @Parameter(description = "삭제할 게시글 ID") Long id);
}
