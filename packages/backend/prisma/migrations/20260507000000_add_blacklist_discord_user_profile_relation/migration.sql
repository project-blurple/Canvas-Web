-- AddForeignKey
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_discord_user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "discord_user_profile"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
