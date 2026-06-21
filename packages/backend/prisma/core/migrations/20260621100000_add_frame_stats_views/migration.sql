CREATE VIEW frame_stats AS
SELECT
  frame.id AS frame_id,
  frame.canvas_id,
  COUNT(DISTINCT history.user_id)::integer AS total_users,
  COUNT(*)::integer AS total_pixels,
  MAX(history.timestamp) AS last_placed_at
FROM
  history
INNER JOIN frame ON
  history.canvas_id = frame.canvas_id
  AND history.x >= frame.x_0
  AND history.x <= frame.x_1
  AND history.y >= frame.y_0
  AND history.y <= frame.y_1
WHERE
  history.user_id NOT IN (
    SELECT
      user_id
    FROM
      blacklist
  )
GROUP BY
  frame.id,
  frame.canvas_id;

CREATE VIEW canvas_colors AS
SELECT
  history.canvas_id,
  history.color_id,
  count(*) AS count
FROM
  history
WHERE
  history.user_id NOT IN (
    SELECT
      user_id
    FROM
      blacklist
  )
GROUP BY
  history.canvas_id,
  history.color_id
ORDER BY
  history.canvas_id,
  count DESC;

CREATE VIEW frame_colors AS
SELECT
  frame.id AS frame_id,
  history.canvas_id,
  history.color_id,
  count(*) AS count
FROM
  history
INNER JOIN frame ON
  history.canvas_id = frame.canvas_id
  AND history.x >= frame.x_0
  AND history.x <= frame.x_1
  AND history.y >= frame.y_0
  AND history.y <= frame.y_1
WHERE
  history.user_id NOT IN (
    SELECT
      user_id
    FROM
      blacklist
  )
GROUP BY
  frame.id,
  history.canvas_id,
  history.color_id
ORDER BY
  history.canvas_id,
  frame.id,
  count DESC;
