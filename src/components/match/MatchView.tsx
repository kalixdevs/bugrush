"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMatchRealtime } from "@/lib/realtimeClient";
import MatchLobby from "./MatchLobby";
import MatchGame from "./MatchGame";
import MatchResults from "./MatchResults";
import type { MatchView as MatchViewType } from "./types";

type Props = {
  match: MatchViewType;
  viewerId: string | null;
};

export default function MatchView({ match, viewerId }: Props) {
  const router = useRouter();

  useMatchRealtime(match.id, () => {
    router.refresh();
  });

  // Poll once a second while in_progress so the round-expired path settles
  // even if no participant submits.
  useEffect(() => {
    if (match.status !== "in_progress") return;
    const id = setInterval(() => router.refresh(), 1000);
    return () => clearInterval(id);
  }, [match.status, router]);

  if (match.status === "ready" || match.status === "cancelled") {
    return <MatchLobby match={match} viewerId={viewerId} />;
  }
  if (match.status === "in_progress") {
    return <MatchGame match={match} viewerId={viewerId} />;
  }
  return <MatchResults match={match} viewerId={viewerId} />;
}
