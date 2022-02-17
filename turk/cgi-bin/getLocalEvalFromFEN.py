#!/usr/bin/env python3

# Use python-chess to communicate with the Stockfish 14 engine and extract lines 
# that have an evaluation in a certain range.

import chess
import chess.engine
# import time

import cgi
import json

# from os.path import exists
import os

ENGINE_PATH = "/usr/local/bin/stockfish"

if 'STOCKFISH' in os.environ:
    ENGINE_PATH = os.environ.get('STOCKFISH')

# ENGINE_PATH = "C:/Users/neptu/Downloads/stockfish_14.1_win_x64_avx2/stockfish_14.1_win_x64_avx2.exe"
# ENGINE_PATH = "/usr/local/bin/stockfish"

def getLocalEvalFromFEN(fen: str, depth: int, engine_path: str) -> float:
    '''
    Returns the evaluation of the position in pawns unit with the depth given, from white's point of view.
    '''
    engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    board = chess.Board(fen)
    limits = chess.engine.Limit(depth=depth)
    # start = time.time()
    info = engine.analyse(board, limits, multipv=1)
    # end = time.time()
    # print("Runtime: ", end - start)
    engine.quit()
    eval = info[0]["score"].white().score()
    return eval/100

if __name__ == "__main__":
    args = cgi.parse()
    if os.path.exists(ENGINE_PATH):
        eval = getLocalEvalFromFEN(args["fen"][0], args["depth"][0], ENGINE_PATH)
        response = {"eval": eval}
        print("Content-Type: application/json;")
        print()
        print(json.JSONEncoder().encode(response))
    else:
        response = { }
        print("Status: 404 Not Found")
        print("Content-Type: application/json;")
        print()
        print(json.JSONEncoder().encode(response))
