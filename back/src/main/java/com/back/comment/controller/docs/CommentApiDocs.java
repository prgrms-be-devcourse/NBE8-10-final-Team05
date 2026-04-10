package com.back.comment.controller.docs;

import com.back.comment.dto.CommentCreateReq;
import com.back.comment.dto.CommentInfoRes;
import com.back.comment.dto.CommentUpdateReq;
import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
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
    name = "댓글",
    description =
        "게시글 댓글과 대댓글을 생성, 조회, 수정, 삭제하는 API입니다. "
            + "현재 보안 정책상 조회를 포함해 모든 댓글 API는 로그인 후 사용할 수 있습니다.")
public interface CommentApiDocs {

  @Operation(
      summary = "댓글 생성",
      description =
          "게시글에 댓글 또는 대댓글을 생성합니다. "
              + "`parentCommentId`를 비우면 부모 댓글, 값을 넣으면 대댓글로 생성됩니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "201", description = "생성 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "404", description = "게시글 또는 부모 댓글 없음")
  })
  ResponseEntity<Void> createComment(
      @Parameter(description = "댓글을 작성할 게시글 ID") Long postId,
      @RequestBody(
              required = true,
              description = "댓글 생성 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = CommentCreateReq.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "content": "저도 비슷한 경험이 있었어요.",
                                    "authorId": null,
                                    "parentCommentId": null
                                  }
                                  """)))
          CommentCreateReq req,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "댓글 목록 조회",
      description =
          "게시글의 부모 댓글 목록을 페이지 단위로 조회합니다. "
              + "각 부모 댓글에는 필요한 경우 대댓글 정보가 함께 포함됩니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<Slice<CommentInfoRes>>> getComments(
      @Parameter(description = "댓글을 조회할 게시글 ID") Long postId,
      @Parameter(description = "페이지 번호, 0부터 시작") int page,
      @Parameter(description = "페이지 크기") int size);

  @Operation(
      summary = "댓글 수정",
      description = "작성자 본인이 자신의 댓글 내용을 수정합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "수정 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "작성자만 수정 가능")
  })
  ResponseEntity<Void> updateComment(
      @Parameter(description = "수정할 댓글 ID") Long commentId,
      @RequestBody(
              required = true,
              description = "댓글 수정 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = CommentUpdateReq.class),
                      examples = @ExampleObject(value = "{\"content\":\"조금 더 자세히 남겨봅니다.\"}")))
          CommentUpdateReq req,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "댓글 삭제",
      description = "작성자 본인이 자신의 댓글을 삭제합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "삭제 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "작성자만 삭제 가능")
  })
  ResponseEntity<RsData<Void>> deleteComment(
      @Parameter(description = "삭제할 댓글 ID") Long commentId,
      @Parameter(hidden = true) AuthenticatedMember authMember);
}
