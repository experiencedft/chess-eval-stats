import chess
import chess.engine
import chess.svg
from getLinesWithinEvalBounds import *

# svg = chess.svg.piece(chess.Piece.from_symbol("R"))
# # print(svg)
# with open("test.svg", 'w') as f:
#     f.write(svg)
# print("Done")

# engine = chess.engine.SimpleEngine.popen_uci(r"C:\Users\neptu\Downloads\stockfish_14.1_win_x64_avx2\stockfish_14.1_win_x64_avx2.exe")

# board = chess.Board()
# move = 1
# while not board.is_game_over():
#     if move == 10: 
#         svg = chess.svg.board(board, size=350)
#         with open("test.svg", 'w') as f:
#             f.write(svg)
#     result = engine.play(board, chess.engine.Limit(time=0.1))
#     board.push(result.move)
#     move += 1

# engine.quit()

ENGINE_PATH = "C:/Users/neptu/Downloads/stockfish_14.1_win_x64_avx2/stockfish_14.1_win_x64_avx2.exe"

FEN = "rnbqk2r/1p2bppp/p3pn2/8/2BP4/P4N2/1P1B1PPP/RN1QK2R w KQkq - 0 9"

DEPTH = 21

print(getLinesWithinEvalBounds(FEN, -0.26, -0.20, DEPTH, 3, ENGINE_PATH))