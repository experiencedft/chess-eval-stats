import chess
import chess.engine
import time

import cgi
import json

# from os.path import exists
import os

from flask import Flask
from flask import request

ENGINE_PATH = "/usr/local/bin/stockfish"

if 'STOCKFISH' in os.environ:
    ENGINE_PATH = os.environ.get('STOCKFISH')

ENGINE_PATH = "C:/Users/neptu/Downloads/stockfish_14.1_win_x64_avx2/stockfish_14.1_win_x64_avx2.exe"
# ENGINE_PATH = "/usr/local/bin/stockfish"

app = Flask(__name__)

@app.route("/")
def getLocalEvalFromFEN():
    '''
    Returns the evaluation of the position in pawns unit with the depth given, from white's point of view.
    '''
    fen = request.args.get('fen')
    depth = request.args.get('depth')
    engine = chess.engine.SimpleEngine.popen_uci(ENGINE_PATH)
    board = chess.Board(fen)
    limits = chess.engine.Limit(depth=depth)
    start = time.time()
    info = engine.analyse(board, limits, multipv=1)
    end = time.time()
    print("Runtime: ", end - start)
    engine.quit()
    eval = info[0]["score"].white().score()
    response = {"eval": eval/100}
    print("Content-Type: application/json;")
    print()
    json_response = json.JSONEncoder().encode(response)
    print(json_response)
    return json_response

# @app.route("/")
# def getLocalEvalFromFEN(fen: str, depth: int, engine_path: str) -> float:
#     '''
#     Returns the evaluation of the position in pawns unit with the depth given, from white's point of view.
#     '''
#     engine = chess.engine.SimpleEngine.popen_uci(engine_path)
#     board = chess.Board(fen)
#     limits = chess.engine.Limit(depth=depth)
#     start = time.time()
#     info = engine.analyse(board, limits, multipv=1)
#     end = time.time()
#     print("Runtime: ", end - start)
#     engine.quit()
#     eval = info[0]["score"].white().score()
#     return eval/100

if __name__ == '__main__':
    app.run(host="localhost", port = 8080, threaded = True)