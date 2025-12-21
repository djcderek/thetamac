import type { Metadata } from "next";
import { MultiplayerClient } from "./multiplayer-client";

export const metadata: Metadata = {
  title: "Multiplayer",
  description:
    "Challenge other players in real-time mental math battles. Compete in 1v1 duels or race against up to 5 players.",
  openGraph: {
    title: "Multiplayer Arena | thetamac",
    description:
      "Challenge other players in real-time mental math battles. Compete in duels or racing modes.",
  },
};

export default function MultiplayerPage() {
  return <MultiplayerClient />;
}
