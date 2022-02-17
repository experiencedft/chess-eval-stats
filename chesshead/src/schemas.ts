import mongoose from 'mongoose';
const { Schema } = mongoose;

const GameSchema = new Schema({
    md5: { type: String, required: true, index: true },
    outcome: { type: String, required: true },
    fens: [{
        type: String
    }]
}, { collection: 'Games' });

export const DBGAMES = mongoose.model('GameSchema', GameSchema)

const FENSchema = new Schema({
    md5: { type: String, required: true, index: true },
    fen: { type: String, required: true },
    eval: { type: Number, required: false }
}, { collection: 'FENs'});

export const DBFENS = mongoose.model('FENSchema', FENSchema)