DROP VIEW IF EXISTS color_leaderboard;

DROP VIEW IF EXISTS color_leaderboard_frame;

DROP VIEW IF EXISTS leaderboard_frame;

CREATE VIEW color_leaderboard AS
SELECT
  history.user_id,
  history.canvas_id,
  history.color_id,
  count(*) AS total_pixels,
  rank() OVER (
    PARTITION BY
      history.canvas_id,
      history.color_id
    ORDER BY
      (count(*)) DESC
  ) AS rank
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
  history.user_id,
  history.canvas_id,
  history.color_id;

CREATE VIEW color_leaderboard_frame AS
SELECT
  history.user_id,
  history.canvas_id,
  frame.id as frame_id,
  history.color_id,
  count(*) AS total_pixels,
  rank() OVER (
    PARTITION BY
      history.canvas_id,
      frame.id,
      history.color_id
    ORDER BY
      (count(*)) DESC
  ) AS rank
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
  history.user_id,
  history.canvas_id,
  frame.id,
  history.color_id;

CREATE VIEW leaderboard_frame AS
SELECT
  color_leaderboard_frame.user_id,
  color_leaderboard_frame.canvas_id,
  color_leaderboard_frame.frame_id,
  (sum(color_leaderboard_frame.total_pixels))::integer AS total_pixels,
  rank() OVER (
    PARTITION BY
      color_leaderboard_frame.canvas_id,
      color_leaderboard_frame.frame_id
    ORDER BY
      (sum(color_leaderboard_frame.total_pixels)) DESC
  ) AS rank
FROM
  color_leaderboard_frame
GROUP BY
  color_leaderboard_frame.user_id,
  color_leaderboard_frame.canvas_id,
  color_leaderboard_frame.frame_id;
