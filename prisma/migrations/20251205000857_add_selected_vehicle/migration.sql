-- AlterTable
ALTER TABLE "multiplayer_matches" ALTER COLUMN "totalRounds" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "race_players" ADD COLUMN     "selectedVehicle" TEXT;
