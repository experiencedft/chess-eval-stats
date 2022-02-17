import * as fs from 'fs';
import readline from 'readline'
import * as cp from 'child_process'
import { EvaluableGame, FENObject, GameOutcome } from './types';
import { DBFENS } from './schemas';
import crypto from 'crypto'
import mongoose from 'mongoose';

const MOVES: number = 10

const isClassicalGame = (pgn: string): boolean => {
    const rx = /chess\s*960|blitz|rapid|9LX|Fischer Random|titled tuesday/ig;

    const isClassical = !(rx.test(pgn));

    // if (!isClassical) {
    //     console.log(pgn)
    // }

    return isClassical;
}


let promise = new Promise(function(resolve, reject) {
    resolve("I am surely going to get resolved!");
  
    reject(new Error('Will this be ignored?')); // ignored
    resolve("Ignored?"); // ignored
  });



const PGNDatabaseParser = async (filename: string, callback: (pgn: string) => void) => {
    return new Promise((resolve, reject) => {
        let currentPGN: string = ""
        let pgnCounter: number = 0
    
        const rl = readline.createInterface({
            input: fs.createReadStream(filename)
        })
    
        rl.on('line', (line: string) => {
            if (line.startsWith('[Event ')) {
                if (currentPGN.length > 0) {
                    if (isClassicalGame(currentPGN)) {
                        pgnCounter++
                        callback(currentPGN);
                    }
                    currentPGN = line;
                } else {
                    currentPGN += '\n' + line;
                }
            } else {
                currentPGN += '\n' + line
            }
        })

        rl.on('error', (err) => {
            reject(err)
        })
    
        rl.on('close', () => {
            // console.log(`found ${pgnCounter} games`)
            // completionFn()
            resolve(`found ${pgnCounter} games`)
        })
    })
}

let countPositions: string[] = []

const fenExtract = (pgn: string): string[] => {
    let rx = /{[^}]+}/g;

    const positions = Array.from(pgn.matchAll(rx)).map((rxma) => rxma[0].replace('\n', ''))
        .map((el) => el.replace(new RegExp("^[ {]+"), ''))
        .map((el) => el.replace(new RegExp("[ }]+$"), ''))

    // const moves = (positions.length < 20) ? positions.length : 20;
    // for (let i = 0; i < moves; i++) {
    //     if (countPositions.indexOf(positions[i]) == -1) {
    //         countPositions.push(positions[i])
    //     }
    // }

    return positions
}

const extractGameOutcome = (pgn: string): GameOutcome => {
    const whiteWon = (pgn.indexOf('[Result "1-0"]') > - 1);
    const blackWon = (pgn.indexOf('[Result "0-1"]') > - 1);
    const draw = (pgn.indexOf('[Result "1/2-1/2"]') > - 1);

    if (!whiteWon && !blackWon && !draw) {
        console.log(pgn)
        throw new Error(`Unknown [Result] Tag`)
    }

    if (whiteWon) return GameOutcome.WhiteWon;
    if (blackWon) return GameOutcome.BlackWon;
    return GameOutcome.Draw;
}

const pgnExtractWithTempFile = (pgn: string): EvaluableGame => {
    const tempFileName = './pgn.game.temp';
    fs.writeFileSync(tempFileName, pgn)

    const cmd = 'pgn-extract --fencomments --quiet -s ./pgn.game.temp';

    const fensedPGN = cp.execSync(cmd).toString()

    fs.unlinkSync(tempFileName)

    return {
        outcome: extractGameOutcome(fensedPGN),
        FENs: fenExtract(fensedPGN).map((el) => <FENObject>{ FEN: el })
    }
}

const processPGN = (pgn: string) => {
    let eg = pgnExtractWithTempFile(pgn)

    pgns.push(eg)
}

const injectCachedEvals = async () => {
    for (let eg = 0; eg < pgns.length; eg++) {
        for (let fen = 0; fen < pgns[eg].FENs.length; fen++) {
            const secret = "This is a secret 🤫";
            
            const md5Hasher = crypto.createHmac('md5', secret)
    
            const fenHash = md5Hasher.update(pgns[eg].FENs[fen].FEN).digest("hex");

            const one = await DBFENS.findOne({ md5: fenHash }).lean().exec()

            if (!(one === undefined || one === null)) {
                pgns[eg].FENs[fen].eval = one.eval;
            }
        }
    }
} 


let pgns: EvaluableGame[] = []
// const databaseFilename = './data/test_db.pgn'
const databaseFilename = './data/10elorange_masters_since2000.pgn'


const main = () => { 
    // mongod --config /usr/local/etc/mongod.conf --fork
    // use chesseval
    const mongoHost = '127.0.0.1:27017';
    const mongoDatabase = 'chesseval';
    const mongoPoolSize = 55;
    const mongoSockeTimeoutMs = 30000;
    const mongoURI = `mongodb://${mongoHost}/${mongoDatabase}`;

    (async () => {
        await mongoose.connect(`${mongoURI}`, {
            minPoolSize: mongoPoolSize,
            socketTimeoutMS: mongoSockeTimeoutMs
        })

        console.log('Connected to MongoDB...')
        console.log('Slurping games...')
        const found = await PGNDatabaseParser(databaseFilename, processPGN)

        console.log(`${found}, injecting cached evals...`)

        await injectCachedEvals()
        
        console.log('done')

        process.exit(0)

    })();
}

main()

// parse -> prime -> eval -> commit 