import type { Metadata } from "next";
import { RacingMode } from "@/components/multiplayer/racing-mode";

export const metadata: Metadata = {
  title: "Private Race Room",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PrivateRacePage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;

  return <RacingMode initialPrivateRoomCode={roomCode} />;
}
