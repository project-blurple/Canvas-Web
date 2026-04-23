SELECT
  leaderboard_guild.user_id,
  leaderboard_guild.canvas_id,
  (sum(leaderboard_guild.total_pixels)) :: integer AS total_pixels,
  rank() OVER (
    PARTITION BY leaderboard_guild.canvas_id
    ORDER BY
      (sum(leaderboard_guild.total_pixels)) DESC
  ) AS rank
FROM
  leaderboard_guild
GROUP BY
  leaderboard_guild.user_id,
  leaderboard_guild.canvas_id;
