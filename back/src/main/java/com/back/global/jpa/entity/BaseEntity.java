package com.back.global.jpa.entity;

import static jakarta.persistence.GenerationType.IDENTITY;
import static lombok.AccessLevel.PROTECTED;

import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = PROTECTED)
public abstract class BaseEntity {

  @Id
  @GeneratedValue(strategy = IDENTITY)
  private Long id;

  @CreatedDate private LocalDateTime createDate;

  @LastModifiedDate private LocalDateTime modifyDate;

  public void setCreateDate(LocalDateTime createDate) {
    this.createDate = createDate;
  }

}
