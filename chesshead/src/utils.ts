import { callbackify } from "util";
import { EvaluableGame } from "./types";

require('dotenv').config();

const headers = {
    Authorization: 'Bearer' + process.env.PERSONAL_ACCESS_TOKEN,
};

// @notice  Query local evaluation of a given position encoded as FEN string from the Lichess database.
// @dev     Need to check the local cached database first
const getLocalEval = async (fen: string):Promise<number> => {
    let result = (await fetch('https://lichess.org/api/cloud-eval/fen=' + fen, { headers })).json()
    return result["pvs"][0]["cp"]
}

/*
 * @notice  Returns 1 if the side that got the earliest engine advantage above threshold is the same as the winning side, 0 otherwise.
 * @param   {array} game_fen An array whose first entry is 1 if White won, 1/2 if the game was a draw, -1 if Black won. The subsequent entries are the sequence of positions of  the game in FEN format.
 * @param   {number} eval_threshold The engine advantage cutoff for which we're investigating the predictive ability.
 * @param   {move_cutoff} The number of moves before which we want to investigate the predictive ability of the evaluation.
*/
const getSingleGameOutcomeCorrelation = async (game_fen: Array<string>, eval_threshold: number, move_cutoff: number): Promise<number> => {
    const WINNING_SIDE = parseInt(game_fen[0], 10)
    // Look only at first moves until the move_cutoff*20-th position
    for (let index:number = 0; index < move_cutoff * 2; index++) {
        // Get engine evaluation of the local position
        const engine_eval = await getLocalEval(game_fen[index]);
        if (Math.abs(engine_eval) > eval_threshold) {
            return (engine_eval * WINNING_SIDE > 0) ? 1 : 0;
        }
    }

    return NaN
}

const getSingleGameOutcomeCorrelationTS = async (game: EvaluableGame, eval_threshold: number, move_cutoff: number): Promise<number> => {
    // Look only at first moves until the move_cutoff*2-th position
    for (let index:number = 0; index < move_cutoff * 2; index++) {
        // get evaluation of the local position, possibly cached
        const engine_eval = game.FENs[index].eval || await getLocalEval(game.FENs[index].FEN);
        if (Math.abs(engine_eval) > eval_threshold) {
            return (engine_eval * game.outcome > 0)? 1 : 0; 
        }
    }

    return NaN
}

/*
@notice     Returns the proportion of games where the first player to get an engine advantage above threshold was also the winner of the game, or when there was a draw. If the first engine advantage is a good predictor of the outcome of a game, this should be significantly above expected percentage of draw OR win according to ELO calculations.
@dev        Need to correct for the calculated expectation according to the ELO rating. Seems intractable and might stick to closely matched ELO.   
@param  {array<array<string>>} An array whose entries are arrays whose first elements are an integer indicating the winner, and the subsequent entries are the sequence of positions of the game in FEN format.
*/
const getGamesCorrelation = async (games_fens: Array<Array<string>>, eval_threshold: number, move_cutoff: number): Promise<number> => {
    let countGames = 0
    let countCorrelatedGames = 0
    const callbackSingleGameOutcome = (game_fen: Array<string>) => {
        return getSingleGameOutcomeCorrelation(game_fen, eval_threshold, move_cutoff)
    }
    games_fens.forEach((game) => {
        if (callbackSingleGameOutcome(game)) {
            countCorrelatedGames++
            countGames++
        } else {
            countGames++
        }
    })
    return countCorrelatedGames/countGames
}

