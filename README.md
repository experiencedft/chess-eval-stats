# chess-eval-stats

Attempting to answer the following question:

*Is a +/- X engine advantage within the first 10 moves a good predictor of who will win the game in past masters games?*

Starting with X = 0.7.

``10elorange_masters_since2000.pgn``: Filtered games from Caissabase 2022_01_08 with the following criteria:

- Only titled players
- Greater than 2400 ELO
- Lower than 10 ELO difference
- At least one move
- Between January 1st 2000 and February 8th 2022

Requirements:

- ts-node, run ``npm install``
- Python 3, ``pip install chess``
- pgn-extract.exe (add to PATH). Download [here.](https://www.cs.kent.ac.uk/people/staff/djb/pgn-extract/)
- Stockfish engine. Download [here](https://stockfishchess.org/download/). Add executable to PATH as STOCKFISH
