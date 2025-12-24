"use client";

import { useParams } from "next/navigation";
import { RacingMode } from "@/components/multiplayer/racing-mode";

/**
 * Private Race Room Page
 * 
 * This page renders the RacingMode component and passes the roomCode
 * so it auto-joins the private room on mount.
 */
export default function PrivateRacePage() {
  const params = useParams();
  const roomCode = typeof params?.roomCode === "string" ? params.roomCode : "";

  return <RacingMode initialPrivateRoomCode={roomCode} />;
}

