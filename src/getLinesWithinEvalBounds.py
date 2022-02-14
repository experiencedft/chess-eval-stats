import chess
import chess.engine

def getLinesWithinEvalBounds(fen: str, lower_bound: float, upper_bound: float, depth: int, multipv: int, engine_path: str) -> list[str]:
    '''
    Return all the lines within a desired evaluation interval in pawn units that 
    have been returned by the multipv stockfish search. Return None if there is 
    no such line.
    '''
    engine = chess.engine.SimpleEngine.popen_uci(engine_path)
    board = chess.Board(fen)
    limits = chess.engine.Limit(depth=depth)
    info = engine.analyse(board, limits, multipv=multipv)
    engine.quit()

    pvs = {}
    lines = []
    hasLines = False

    # Extract all PVs and their evaluation from engine output and store in a dict
    for i in range(len(info)):
        eval = info[i]["score"].relative.score()
        uci_line = info[i]["pv"]
        # Needed to convert to PGN notation from UCI
        chess.Board(fen)
        pgn_line = board.variation_san(uci_line)
        # Convert from centipanw to pawn unit
        pvs[i] = {"eval": eval/100, "uci_line": uci_line, "pgn_line": pgn_line} 

    #Filter by evaluation
    for i in range(len(pvs)):
        if pvs[i]["eval"] > lower_bound and pvs[i]["eval"] < upper_bound: 
            lines.append(pvs[i]["pgn_line"])
            hasLines = True 
        
    if hasLines == False:
        return None
    
    return lines