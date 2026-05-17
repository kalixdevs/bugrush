export type MatchParticipantView = {
  userId: string;
  name: string;
  handle: string | null;
  image: string | null;
  team: number;
  ready: boolean;
  score: number;
  solveTimeMs: number | null;
  submitted: boolean;
};

export type MatchView = {
  id: string;
  hostId: string;
  mode: string;
  privacy: string;
  difficulty: string;
  language: string;
  roundSeconds: number;
  status: string;
  challengeId: string | null;
  startedAt: string | null;
  winnerTeam: number | null;
  participants: MatchParticipantView[];
};
