import mongoose from 'mongoose';
const { Schema } = mongoose;

const GameSchema = new Schema({
    md5: { type: String, required: true, index: true },
    processed: { type: Boolean, required: true, index: true, default: false }
}, { collection: 'Games' });

export const DBGames = mongoose.model('GameSchema', GameSchema)

const FENSchema = new Schema({
    md5: { type: String, required: true, index: true },
    fen: { type: String, required: true },
    eval: { type: Number, required: false }
}, { collection: 'FENs'});

export const DBFENS = mongoose.model('FENSchema', FENSchema)