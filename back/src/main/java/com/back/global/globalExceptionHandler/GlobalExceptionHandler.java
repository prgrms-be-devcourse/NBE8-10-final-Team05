package com.back.global.globalExceptionHandler;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private ResponseEntity<RsData<Void>> buildResponse(RsData<Void> rsData, org.springframework.http.HttpStatus status, HttpServletRequest request) {
    String acceptHeader = request.getHeader("Accept");

    // SSE 요청(text/event-stream) 중 에러가 발생한 경우 타입을 JSON으로 변경
    if (acceptHeader != null && acceptHeader.contains(MediaType.TEXT_EVENT_STREAM_VALUE)) {
      return ResponseEntity
              .status(status)
              .contentType(MediaType.APPLICATION_JSON)
              .body(rsData);
    }

    return new ResponseEntity<>(rsData, status);
  }

  @ExceptionHandler(ServiceException.class)
  public ResponseEntity<RsData<Void>> handle(
      ServiceException exception, HttpServletRequest request, HttpServletResponse response) {
    RsData<Void> rsData = exception.getRsData();
    response.setStatus(rsData.statusCode());
    return buildResponse(rsData, HttpStatus.valueOf(rsData.statusCode()), request);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<RsData<Void>> handle(IllegalArgumentException exception) {
    return new ResponseEntity<>(new RsData<>("400-1", exception.getMessage()), BAD_REQUEST);
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<RsData<Void>> handle(AccessDeniedException exception) {
    return new ResponseEntity<>(new RsData<>("403-1", "You do not have permission."), FORBIDDEN);
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<RsData<Void>> handle(NoResourceFoundException exception) {
    return new ResponseEntity<>(new RsData<>("404-1", "Resource not found."), NOT_FOUND);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<RsData<Void>> handle(Exception exception, HttpServletRequest request) {
    // SSE 연결 끊김(ClientAbortException 등)은 실질적인 서버 장애가 아니므로 로깅 레벨을 낮추거나 별도 처리 가능
    return buildResponse(new RsData<>("500-1", "Unexpected server error."), INTERNAL_SERVER_ERROR, request);
  }
}
