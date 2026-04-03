package com.back.image.adapter.out.persistence;

import com.back.image.domain.Image;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImageRepository extends JpaRepository<Image, Long> {
    Optional<Image> findByStoredName(String storedName);
    List<Image> findAllByStoredNameIn(List<String> storedNames);
    List<Image> findAllByStatusAndCreateDateBefore(Image.ImageStatus status, LocalDateTime dateTime);
}
