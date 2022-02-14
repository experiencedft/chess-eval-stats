# Use python-chess to communicate with the Stockfish 14 engine and extract lines 
# that have an evaluation in a certain range.

import chess
import chess.engine


def getLocalEvalFromFEN(fen: str, depth: int, engine_path: str) -> float:
    '''
    Returns the evaluation of the position in pawns unit with the depth given.
    '''
    engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    board = chess.Board(fen)
    limits = chess.engine.Limit(depth=depth)
    info = engine.analyse(board, limits, multipv=1)
    engine.quit()
    eval = info[0]["score"].relative.score()
    return eval/100