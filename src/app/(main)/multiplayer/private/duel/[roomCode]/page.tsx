"use client";

import { useParams } from "next/navigation";
import { DuelMode } from "@/components/multiplayer/duel-mode";

/**
 * Private Duel Room Page
 * 
 * This page renders the DuelMode component and passes the roomCode
 * so it auto-joins the private room on mount.
 */
export default function PrivateDuelPage() {
  const params = useParams();
  const roomCode = typeof params?.roomCode === "string" ? params.roomCode : "";

  return <DuelMode initialPrivateRoomCode={roomCode} />;
}
