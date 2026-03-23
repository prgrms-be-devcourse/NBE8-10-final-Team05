package com.back.global.globalExceptionHandler;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import com.back.global.exception.ServiceException;
import com.back.global.rsData.RsData;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<RsData<Void>> handle(AccessDeniedException exception) {
    return new ResponseEntity<>(new RsData<>("403-1", "You do not have permission."), FORBIDDEN);
  }

  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<RsData<Void>> handle(NoResourceFoundException exception) {
    return new ResponseEntity<>(new RsData<>("404-1", "Resource not found."), NOT_FOUND);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<RsData<Void>> handle(Exception exception) {
    return new ResponseEntity<>(
        new RsData<>("500-1", "Unexpected server error."), INTERNAL_SERVER_ERROR);
  }
}
