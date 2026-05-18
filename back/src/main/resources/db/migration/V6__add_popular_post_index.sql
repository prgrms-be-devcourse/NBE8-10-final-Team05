CREATE INDEX idx_post_popular_published
    ON post (status, category, view_count DESC, create_date DESC, id DESC);
