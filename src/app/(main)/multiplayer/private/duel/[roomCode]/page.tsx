import type { Metadata } from "next";
import { DuelMode } from "@/components/multiplayer/duel-mode";

export const metadata: Metadata = {
  title: "Private Duel Room",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PrivateDuelPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;

  return <DuelMode initialPrivateRoomCode={roomCode} />;
}
