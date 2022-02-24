#!/usr/bin/env python3

from pymongo import MongoClient
import numpy as np
from scipy.stats import pearsonr 

IS_TEST = False

# Control threshold slightly above the initial white advantage.
CONTROL_THRESHOLD = 0.5
EVAL_THRESHOLD = 0.6
MOVE_CUTOFF = 10

# DETERMINE IF WE'RE STUDYING SCORING RATE OR WIN RATE
SCORE = False

def isGameControl(game: dict, control_threshold: float, fens_eval_db):
    '''
    Check if the game has all moves below control threshold.
    '''
    fens = game["fens"]
    evals = np.array([])
    for fen in fens:
        evals = np.append(evals, fens_eval_db.find_one({'md5': fen})["eval"])
    if (all(abs(evals) < CONTROL_THRESHOLD)):
        return True
    else: 
        return False


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
        if there is such occurrence, returns TRUE if that side is the same as the winning side OR if there is a Draw
        FALSE otherwise. 
    '''
    fens = game["fens"]
    #  1 = White
    # -1 = Black
    if game["outcome"] == 'WhiteWon':
        outcome = 1
    elif game["outcome"] == 'BlackWon':
        outcome = -1
    for i in range(move_cutoff*2):
        fen = fens[i]
        engine_eval = fens_eval_db.find_one({'md5': fen})["eval"]
        if abs(engine_eval) > eval_threshold:
            # print(engine_eval)
            if SCORE == True:
                if game["outcome"] == 'Draw' and engine_eval > 0:
                    outcome = 1
                elif game["outcome"] == 'Draw' and engine_eval < 0:
                    outcome = -1
            else:
                if game["outcome"] == 'Draw':
                    outcome = 0
            first_advantage_side = 'White' if i%2 == 0 else 'Black'
            # print("First advantage side for each relevant game: ",first_advantage_side)
            if (engine_eval*outcome > 0):
                return True, first_advantage_side
            else:
                return False, first_advantage_side
                
    return None  


client = MongoClient('mongodb://localhost:27017/')
db = client.chesseval
games_db = db.Games
fen_evals_db = db.FENs

n_games = games_db.count_documents({})

# Number of times black or white wins
n_black_wins_total = 0
n_white_wins_total = 0
n_draws_total = 0
n_black_wins_control = 0
n_white_wins_control = 0
n_draws_control = 0
n_control_games = 0

# Number of draws

# Number of relevant games and wins and draws 
# among these
n_wins_black_relevant = 0
n_wins_white_relevant = 0
n_draws_relevant = 0
n_relevant_games = 0

# Number of times white or black respecitvely 
# got the first advantage above threshold in 
# relevant games

n_white_first_advantage = 0 
n_black_first_advantage = 0

# Number of games where each side both had 
# the first advantage and won
n_wins_black_correlated = 0
n_wins_white_correlated = 0
n_correlated = 0

# An array of entries for control games (i.e. non-relevant
# games). X = 1 if white (resp. black) scored, 0 otherwise.

control_white_score = []
control_black_score = []
n_white_scores_control = 0
n_black_scores_control = 0

# An array of observation samples for the random variable.
# X  = 1 if the first to get an advantage above threshold 
# won, 0 otherwise.
samples = []

# Define iterable cursor over all members of the collection
games = games_db.find()

i = 0

for game in games:

    if i% (n_games//20) == 0:
        print("Processing... ", round(100*(i/n_games)), "%")

    outcome = game['outcome']

    if (outcome == 'WhiteWon'):
        n_white_wins_total += 1
    elif (outcome == 'Draw'):
        n_draws_total += 1
    if (outcome == 'BlackWon'):
        n_black_wins_total += 1

    correlation = getGameOutcomeCorrelation(game, EVAL_THRESHOLD, MOVE_CUTOFF, fen_evals_db)
    # Determine if the game is relevant to the analysis 
    # (existence of an engine advantage above threshold 
    # within the first MOVE_CUTOFF moves)
    if correlation is not None:
        # Increment relevant games counter
        n_relevant_games +=1
        # print(correlation[1])
        if outcome == 'WhiteWon':
            n_wins_white_relevant += 1
        elif outcome == 'BlackWon':
            n_wins_black_relevant +=1
        elif outcome == 'Draw':
            n_draws_relevant +=1

        if correlation[1] == "White":
            n_white_first_advantage += 1
        elif correlation[1] == "Black":
            n_black_first_advantage += 1
        # If the relevant game has a correlation, 
        # record which side had the first advantage 
        # for EV calcs
        if correlation[0] == True:
            if correlation[1] == "White":
                n_wins_white_correlated += 1
            else: 
                n_wins_black_correlated += 1
            samples.append(1)
            n_correlated += 1
        else: 
            samples.append(0)

    # If the game is not relevant, check if it can be added to control
    elif isGameControl(game, CONTROL_THRESHOLD, fen_evals_db): 
        n_control_games += 1
        if outcome == 'WhiteWon':
            n_white_scores_control +=1
            n_white_wins_control += 1
            control_white_score.append(1)
            control_black_score.append(0)
        elif outcome == 'BlackWon':
            n_black_scores_control += 1
            n_black_wins_control += 1
            control_white_score.append(0)
            control_black_score.append(1)
        elif outcome == 'Draw':
            n_draws_control += 1
            if SCORE == True: 
                n_white_scores_control += 1
                n_black_scores_control += 1
                control_white_score.append(1)
                control_black_score.append(1)
            else:
                control_white_score.append(0)
                control_black_score.append(0)
    i+=1

# Calculate expected score or win rate from control

expected_black_score_rate = np.mean(control_black_score) 
expected_white_score_rate = np.mean(control_white_score) 
if SCORE == True:
    std_black_score_rate = np.std(control_black_score)/np.sqrt(n_black_scores_control)
    std_white_score_rate = np.std(control_white_score)/np.sqrt(n_white_scores_control)
else: 
    std_black_score_rate = np.std(control_black_score)/(np.sqrt(n_black_wins_control)+np.sqrt(n_draws_control))
    std_white_score_rate = np.std(control_white_score)/(np.sqrt(n_white_wins_control)+np.sqrt(n_draws_control))

# Calculate covariance between the two variables White Scores and Black Scores
white_black_score_correlation = pearsonr(control_white_score, control_black_score)[0]


# Calculate relevant sample expected rate and observed rate

sample_expected_rate = (n_white_first_advantage*expected_white_score_rate + n_black_first_advantage*expected_black_score_rate)/n_relevant_games

sample_expected_rate_std = ((1/n_relevant_games)*np.sqrt((n_white_first_advantage*std_white_score_rate)**2 + (n_black_first_advantage*std_black_score_rate)**2 + 2*n_white_first_advantage*n_black_first_advantage*white_black_score_correlation*std_black_score_rate*std_white_score_rate))

expected_rate_95_confidence_interval = [sample_expected_rate - 1.96*sample_expected_rate_std, sample_expected_rate + 1.96*sample_expected_rate_std]

sample_observed_rate = np.mean(samples)
sample_observed_rate_std = np.std(samples)/np.sqrt(n_relevant_games)
observed_rate_95_confidence_interval = [sample_observed_rate-1.96*sample_observed_rate_std, sample_observed_rate+1.96*sample_observed_rate_std]

# TEST WITH TEST_DB.PGN

if IS_TEST == True:
    print("Testing for a threshold of {EVAL_THRESHOLD}.")
    print("Total number of unique FENs... ", end="")
    print("PASS") if fen_evals_db.count_documents({}) == 37 else print("FAIL")
    print("Total White wins... ", end="")
    print("PASS") if n_white_wins_total == 3 else print("FAIL")
    print("Total Black wins... ", end="")
    print("PASS") if n_black_wins_total == 3 else print("FAIL")
    print("Total draws... ", end="")
    print("PASS") if n_draws_total == 3 else print("FAIL")
    print("White wins control... ", end="")
    print("PASS") if n_white_wins_control == 1 else print("FAIL")
    print("Black wins control... ", end="")
    print("PASS") if n_black_wins_control == 1 else print("FAIL")
    print("Draws control... ", end="")
    print("PASS") if n_draws_control == 1 else print("FAIL")
    print("White relevant... ", end="")
    print("PASS") if n_wins_white_relevant == 2 else print("FAIL")
    print("Black relevant... ", end="")
    print("PASS") if n_wins_black_relevant == 2 else print("FAIL")
    print("Draws relevant... ", end="")
    print("PASS") if n_draws_relevant == 2 else print("FAIL")
    print("White correlated... ", end="")
    print("PASS") if n_wins_white_correlated == 2 else print("FAIL")
    print("Black correlated... ", end="")
    print("PASS") if n_wins_black_correlated == 2 else print("FAIL")
    print("n_relevant = n_white_first_advantage + n_black_first_advantage... ", end="")
    print("PASS") if n_relevant_games == n_white_first_advantage + n_black_first_advantage else print("FAIL")
    print("Control white score... ", end="")
    print("PASS") if control_white_score == [1, 0, 1] else print("FAIL")
    print("Control black score... ", end="")
    print("PASS") if control_black_score == [0, 1, 1] else print("FAIL")
    print("Samples... ", end="")
    print("PASS") if samples == [1, 0, 1, 1, 0, 1] else print("FAIL")
    print("Sample expected rate... ", end="")
    print("PASS") if sample_expected_rate == (3*(2/3)+3*(2/3))/6 else print("FAIL")
    print("Sample observed rate... ", end="")
    print("PASS") if sample_observed_rate == 4/6 else print("FAIL")

else: 

    if SCORE == True:
        print("Total number of games: ", games_db.count_documents({}))
        print("Total number of unique positions: ", fen_evals_db.count_documents({}))
        print("Number of control games: ", n_control_games)
        print("Expected white score rate: ", expected_white_score_rate, " +/- ", std_white_score_rate)
        print("Expected black score rate: ", expected_black_score_rate, " +/- ", std_black_score_rate)
        print("Number of games with an advantage above threshold: ", n_relevant_games)
        print("Control score rate confidence interval: ", expected_rate_95_confidence_interval)
        print("Score rate confidence interval for first advantage side: ", observed_rate_95_confidence_interval)
    else: 
        print("Total number of games: ", games_db.count_documents({}))
        print("Total number of unique positions: ", fen_evals_db.count_documents({}))
        print("Number of control games: ", n_control_games)
        print("Expected white win rate: ", expected_white_score_rate, " +/- ", std_white_score_rate)
        print("Expected black win rate: ", expected_black_score_rate, " +/- ", std_black_score_rate)
        print("Number of games with an advantage above threshold: ", n_relevant_games)
        print("Control win rate confidence interval: ", expected_rate_95_confidence_interval)
        print("Win rate confidence interval for first advantage side: ", observed_rate_95_confidence_interval)
        
    




# print("Number of white wins: ", n_white_wins_total)
# print("Number of black wins: ", n_black_wins_total)
# print("Number of draws: ", n_draws_total)
# print("Number of relevant games: ", n_relevant_games)
# print("Samples: ", samples)