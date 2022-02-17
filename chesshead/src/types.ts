export const GameOutcomeName = {
  "1": "WhiteWon",
  "-1": "BlackWon",
  "0.5": "Draw"
}

export enum GameOutcome {
  WhiteWon = 1,
  BlackWon = -1,
  Draw = 0.5  
} 

export type FENObject = {
    FEN: string;
    eval?: number;
}

export type EvaluableGame = {
    outcome: GameOutcome;
    FENs: FENObject[];
    header: string[];
}