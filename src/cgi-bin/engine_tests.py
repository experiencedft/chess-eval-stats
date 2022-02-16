import chess
import chess.engine
import chess.svg
from getLinesWithinEvalBounds import *
from getLocalEvalFromFEN import *
import time

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

# Test automated search of new lines

# FEN = "rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3"
# LOWER = -1
# UPPER = -0.3
# DEPTH = 22
# MULTIPV = 40

# start = time.time()
# lines = getLinesWithinEvalBounds(FEN, LOWER, UPPER, DEPTH, MULTIPV, ENGINE_PATH)
# for line in lines:
#     print(line, "\n")
# end = time.time()
# print("\n"+ str(end - start), " seconds")

# Test particular line 

# FEN = "rnbqkb1r/pppp1ppp/4pn2/8/2PP2P1/8/PP2PP1P/RNBQKBNR b KQkq - 0 3"

# print(getLocalEvalFromFEN(FEN, 22, ENGINE_PATH))

print(getLocalEvalFromFEN("rnbqk2r/1p2bppp/p3pn2/8/2BP4/P4N2/1P1B1PPP/RN1QK2R w KQkq - 0 9", 21, ENGINE_PATH))