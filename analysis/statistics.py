#!/usr/bin/env python3

from pymongo import MongoClient
import numpy as np

EVAL_THRESHOLD = 0.6
MOVE_CUTOFF = 10

def getGameOutcomeCorrelation(game: dict, eval_threshold: float, move_cutoff: int, fens_eval_db):
    '''
    Returns True if the winning side is the first side to get an engine evaluation above threshold 
    within the first move_cutoff moves, False otherwise.

    params: 

    game: dict
        a chess game represented as dictionnary up to MongoDB specs
    eval_treshold: float
        the engine evaluation *in pawn units* and *from White's POV* that we want 
        to test for significance
    move_cutoff: int
        the number of moves where we want to stop analyzing for engine eval significance
        this is NOT the number of positions. e.g. the third position of a chess game is 
        the second move for black.
    fens_eval_db: 
        a MongoDB colletion of FENs and their evaluations

    returns: 

    isCorrelated: bool or None
        returns None if NO side had an engine advantage above threshold within the first 10 moves.
        if there is such occurrence, returns TRUE if that side is the same as the winning side,
        FALSE otherwise. 
    '''
    fens = game["fens"]
    #  1 = White
    # -1 = Black
    if game["outcome"] == 'WhiteWon' or game["outcome"] == 'Draw':
        outcome = 1
    elif game["outcome"] == 'BlackWon':
        outcome = -1
    for i in range(move_cutoff*2):
        fen = fens[i]
        engine_eval = fens_eval_db.find_one({'md5': fen})["eval"]
        if abs(engine_eval) > eval_threshold:
            first_advantage_side = 'White' if i%2 ==0 else 'Black'
            if (engine_eval*outcome > 0):
                return True, first_advantage_side
                
    return None  


client = MongoClient('mongodb://localhost:27017/')
db = client.chesseval
games_db = db.Games
fen_evals_db = db.FENs

n_games = games_db.count_documents({})

# Number of times black or white wins
n_black = 0
n_white = 0
# Number of draws
n_draws = 0
n_black_first_advantage = 0
n_white_first_advantage = 0
n_relevant_games = 0

# An array of observation samples for the random variable
# X  = 1 if the first to get an advantage above threshold 
# won, 0 otherwise.
samples = []

# Define iterable cursor over all members of the collection
games = games_db.find()

for game in games:

    if (game['outcome'] == 'WhiteWon') or (game['outcome'] == 'Draw'):
        n_white += 1
        n_draws += 1
    if (game['outcome'] == 'BlackWon'):
        n_black += 1

    correlation = getGameOutcomeCorrelation(game, EVAL_THRESHOLD, MOVE_CUTOFF, fen_evals_db)
    # Determine if the game is relevant to the analysis 
    # (existence of an engine advantage above threshold 
    # within the first MOVE_CUTOFF moves)
    if correlation is not None:
        # If game is relevant, record which side had the 
        # first advantage for EV calcs
        if correlation[1] == "White":
            n_white_first_advantage += 1
        else: 
            n_black_first_advantage += 1
        # Increment relevant games counter
        n_relevant_games +=1
        # Add 1 to sample mean if correlation
        if correlation[0] == True: 
            samples.append(1)
        else: 
            samples.append(0)

# Calculate sample mean

sample_mean = np.mean(samples)
sample_std = np.std(samples)
confidence_interval_95 = [sample_mean-1.96*sample_std, sample_mean+1.96*sample_std]

print("Number of white wins: ", n_white)
print("Number of black wins: ", n_black)
print("Number of draws: ", n_draws)
print("Number of relevant games: ", n_relevant_games)
print("Samples: ", samples)




    
