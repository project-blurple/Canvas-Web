CREATE INDEX idx_history_canvas_timestamp_non_erased
ON history (canvas_id, "timestamp")
WHERE erased_at IS NULL;
