# chess-eval-stats

Attempting to answer the following question:

*Is a +/- X engine advantage within the first 10 moves a good predictor of who will win the game in past masters games?*

Starting with X = 0.7.

``test_db.pgn``: Filtered games from Caissabase 2022_01_08 with the following criteria:

- Only titled players
- Greater than 2400 ELO
- Lower than 50 ELO difference
- At least one move
- Between January 1st 2016 and February 8th 2022
