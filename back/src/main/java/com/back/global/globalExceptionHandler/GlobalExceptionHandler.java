package com.back.global.globalExceptionHandler;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ServiceException.class)
  public RsData<Void> handle(ServiceException exception, HttpServletResponse response) {
    RsData<Void> rsData = exception.getRsData();
    response.setStatus(rsData.statusCode());
    return rsData;
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<RsData<Void>> handle(IllegalArgumentException exception) {
    return new ResponseEntity<>(new RsData<>("400-1", exception.getMessage()), BAD_REQUEST);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<RsData<Void>> handle(Exception exception) {
    return new ResponseEntity<>(
        new RsData<>("500-1", "Unexpected server error."), INTERNAL_SERVER_ERROR);
  }
}
