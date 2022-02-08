require('dotenv').config();

const headers = {
    Authorization: 'Bearer' + process.env.PERSONAL_ACCESS_TOKEN,
};

const getLocalEval = function (fen: string) {
    /*
    @dev Probably needs to be optimized for async fetching.
    */
    let result = fetch('https://lichess.org/api/cloud-eval/fen=' + fen)
        .then(res => res.json())
    return result["pvs"][0]["cp"]
}

/*
 * @notice Returns 1 if the side that got the earliest engine advantage above threshold is the same as the winning side, 0 otherwise.
 * @param {array} game_fen An array whose first entry is 1 if White won, 1/2 if the game was a draw, -1 if Black won. The subsequent entries are the sequence of positions of  the game in FEN format.
 * @param {number} eval_threshold The engine advantage cutoff for which we're investigating the predictive ability.
 * @param {move_cutoff} The number of moves before which we want to investigate the predictive ability of the evaluation.
*/
const getSingleGameOutcomeCorrelation = function (game_fen: Array<string>, eval_threshold: Number, move_cutoff: Number) {
    let isBelowThreshold = true;
    let index = 0
    const WINNING_SIDE = parseInt(game_fen[0], 10)

    while (isBelowThreshold) {
        const engine_eval = getLocalEval(game_fen[index++]);
        if (Math.abs(engine_eval) > eval_threshold) {
            return (engine_eval * WINNING_SIDE > 0) ? 1 : 0;
        }
    }

    return NaN
}