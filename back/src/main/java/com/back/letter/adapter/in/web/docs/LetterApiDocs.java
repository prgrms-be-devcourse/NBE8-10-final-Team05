package com.back.letter.adapter.in.web.docs;

import com.back.global.rsData.RsData;
import com.back.global.security.adapter.in.AuthenticatedMember;
import com.back.letter.application.port.in.dto.CreateLetterReq;
import com.back.letter.application.port.in.dto.LetterInfoRes;
import com.back.letter.application.port.in.dto.LetterListRes;
import com.back.letter.application.port.in.dto.LettersStatsRes;
import com.back.letter.application.port.in.dto.ReplyLetterReq;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;

@Tag(
    name = "편지",
    description =
        "익명/랜덤 편지 송수신, 수락/거절, 답장, 상태 추적을 제공하는 핵심 서비스 API입니다. 모든 엔드포인트는 로그인 후 사용할 수 있습니다.")
public interface LetterApiDocs {

  @Operation(
      summary = "편지 보내기",
      description =
          "새 편지를 작성해 즉시 전송합니다. 수신자는 서비스의 매칭 규칙에 따라 결정되며, "
              + "사용자는 제목과 본문만 입력하면 됩니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "전송 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<Long>> create(
      @RequestBody(
              required = true,
              description = "편지 생성 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = CreateLetterReq.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "title": "누군가에게 털어놓고 싶어요",
                                    "content": "오늘 하루가 너무 버거웠어요. 제 얘기를 들어줄 사람이 필요해요."
                                  }
                                  """)))
          CreateLetterReq req,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "받은 편지함 조회",
      description = "현재 사용자가 받은 편지 목록을 페이지 단위로 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<LetterListRes>> getReceivedLetters(
      @Parameter(description = "페이지 번호, 0부터 시작") int page,
      @Parameter(description = "페이지 크기") int size,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "보낸 편지함 조회",
      description = "현재 사용자가 보낸 편지 목록을 페이지 단위로 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<LetterListRes>> getSentLetters(
      @Parameter(description = "페이지 번호, 0부터 시작") int page,
      @Parameter(description = "페이지 크기") int size,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "편지 상세 조회",
      description = "특정 편지의 상세 내용을 조회합니다. 권한이 없는 편지는 조회할 수 없습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "접근 권한 없음")
  })
  ResponseEntity<RsData<LetterInfoRes>> getDetail(
      @Parameter(description = "편지 ID") long id,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "편지 답장",
      description = "받은 편지에 대한 답장을 등록합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "답장 등록 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요"),
    @ApiResponse(responseCode = "403", description = "답장 권한 없음")
  })
  ResponseEntity<RsData<Void>> reply(
      @Parameter(description = "답장할 편지 ID") long id,
      @RequestBody(
              required = true,
              description = "답장 요청",
              content =
                  @Content(
                      mediaType = "application/json",
                      schema = @Schema(implementation = ReplyLetterReq.class),
                      examples =
                          @ExampleObject(
                              value =
                                  """
                                  {
                                    "replyContent": "당신의 하루가 조금이라도 가벼워졌으면 좋겠어요."
                                  }
                                  """)))
          ReplyLetterReq req,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "편지 수락",
      description =
          "받은 편지를 수락 처리합니다. "
              + "수락 후 답장 또는 후속 작성 흐름으로 이어질 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "수락 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<Void>> acceptLetter(
      @Parameter(description = "편지 ID") long id,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "편지 거절",
      description = "받은 편지를 거절하고 다른 수신자에게 재배정하도록 처리합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "거절 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<Void>> rejectLetter(
      @Parameter(description = "편지 ID") long id,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "작성 중 상태 갱신",
      description =
          "편지에 대한 답장 또는 작성 흐름이 진행 중임을 표시합니다. "
              + "실시간 상태 표시나 작성 중 UX 동기화에 사용할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "상태 갱신 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<Void>> updateWritingStatus(
      @Parameter(description = "편지 ID") long id,
      @Parameter(hidden = true) AuthenticatedMember authMember);

  @Operation(
      summary = "편지 상태 조회",
      description =
          "편지의 실시간 상태 문자열을 조회합니다. "
              + "수락 여부, 작성 중 여부 등 프론트 상태 표시용으로 사용할 수 있습니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공")
  })
  ResponseEntity<RsData<String>> getStatus(@Parameter(description = "편지 ID") long id);

  @Operation(
      summary = "편지함 통계 조회",
      description = "받은 편지함/보낸 편지함 기반의 개인 통계를 조회합니다.")
  @ApiResponses({
    @ApiResponse(responseCode = "200", description = "조회 성공"),
    @ApiResponse(responseCode = "401", description = "인증 필요")
  })
  ResponseEntity<RsData<LettersStatsRes>> getMailboxStats(
      @Parameter(hidden = true) AuthenticatedMember authMember);
}
