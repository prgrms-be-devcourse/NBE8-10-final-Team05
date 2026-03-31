package com.back.image.adapter.out.persistence;

import com.back.image.domain.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ImageRepository extends JpaRepository<Image, Long> {
    Optional<Image> findByStoredName(String storedName);
}
