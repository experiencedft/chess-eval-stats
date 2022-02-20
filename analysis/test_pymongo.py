import pymongo 
import pprint
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')

db = client.chesseval

collection = db.Games
fens_db = db.FENs

print(fens_db.count_documents({}))

# for fen in fens_db.find(): 
#     pprint.pprint(fen)



# N_games = collection.count_documents({})

# cursor = collection.find()

# for game in cursor:
#     pprint.pprint(game)
