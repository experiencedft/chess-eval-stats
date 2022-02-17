import * as fs from 'fs';
import readline from 'readline'
import * as cp from 'child_process'
import { EvaluableGame, FENObject, GameOutcome } from './types';
import { DBFENS, DBGAMES } from './schemas';
import crypto from 'crypto'
import mongoose from 'mongoose';
import nfetch from 'node-fetch'

const MOVES: number = 10

const isClassicalGame = (pgn: string): boolean => {
    const rx = /chess\s*960|blitz|rapid|9LX|Fischer Random|titled tuesday/ig;

    const isClassical = !(rx.test(pgn));

    // if (!isClassical) {
    //     console.log(pgn)
    // }

    return isClassical;
}


let promise = new Promise(function (resolve, reject) {
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
            pgnCounter++
            callback(currentPGN)
            resolve(`found ${pgnCounter} games`)
        })
    })
}

let countPositions: string[] = []

const extractFEN = (pgn: string): string[] => {
    let rx = /{[^}]+}/g;

    const positions = Array.from(pgn.matchAll(rx)).map((rxma) => rxma[0].replace('\n', ' ').replace('  ', ' '))
        .map((el) => el.replace(new RegExp("^[ {]+"), ''))
        .map((el) => el.replace(new RegExp("[ }]+$"), ''))

    // const moves = (positions.length < 20) ? positions.length : 20;
    // for (let i = 0; i < moves; i++) {
    //     if (countPositions.indexOf(positions[i]) == -1) {
    //         countPositions.push(positions[i])
    //     }
    // }

    // console.log(positions)

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

const extractHeader = (pgn: string):string[] => {
    let rx = /\[[^\]]+\]/g;

    const matches = pgn.matchAll(rx)

    const arrayified = Array.from(matches)
    
    
    // console.log(.map((rxma) => rxma[0].replace('\n', '')))

    return arrayified.map((rxma) => rxma[0].replace('\n', ''))
}

const pgnExtractWithTempFile = (pgn: string): EvaluableGame => {
    const tempFileName = './pgn.game.temp';
    fs.writeFileSync(tempFileName, pgn)

    const cmd = 'pgn-extract --fencomments --quiet -s ./pgn.game.temp';

    const fensedPGN = cp.execSync(cmd).toString()

    fs.unlinkSync(tempFileName)

    return {
        outcome: extractGameOutcome(fensedPGN),
        FENs: extractFEN(fensedPGN).map((el) => <FENObject>{ FEN: el }),
        header: extractHeader(fensedPGN)
    }
}

const processPGN = (pgn: string) => {
    let eg = pgnExtractWithTempFile(pgn)

    pgns.push(eg)
}

const DEPTH = 21

const getStockfishEval = async (fen: string, depth: number): Promise<number> => {
    const URL = `http://127.0.0.1:8080/cgi-bin/getLocalEvalFromFEN.py?fen=${fen}&depth=${depth}`

    let res: Response = await nfetch(URL)

    let evaluation = await res.json()

    return evaluation["eval"]
}

const injectCachedEvals = async () => {
    for (let eg = 0; eg < pgns.length; eg++) {
        let fenMD5s:string[] = []
        process.stdout.write(`processing ${eg + 1}/${pgns.length}\r`)

        for (let fen = 0; fen < pgns[eg].FENs.length; fen++) {
            // console.log(pgns[eg].FENs[fen].FEN)
            const thisFEN = pgns[eg].FENs[fen].FEN

            const secret = "This is a secret 🤫";

            const md5Hasher = crypto.createHmac('md5', secret)

            const fenHash = md5Hasher.update(pgns[eg].FENs[fen].FEN).digest("hex");

            const one = await DBFENS.findOne({ md5: fenHash }).lean().exec()

            if (!(one === undefined || one === null)) {
                pgns[eg].FENs[fen].eval = one.eval;

                // console.log(`Found cached eval`)
            } else {
                pgns[eg].FENs[fen].eval = await getStockfishEval(pgns[eg].FENs[fen].FEN, DEPTH)

                await DBFENS.create({ md5: fenHash, fen: thisFEN, eval: pgns[eg].FENs[fen].eval })

                // console.log(`Stored S(eval) = ${pgns[eg].FENs[fen].eval}`)
            }

            fenMD5s.push(fenHash)
        }

        // console.log(pgns[eg].header)

        // store the game
        const secret = "This is a secret 🤫";

        const md5Hasher = crypto.createHmac('md5', secret)

        const gameHash = md5Hasher.update(fenMD5s.join() + pgns[eg].header.join()).digest("hex");

        const one = await DBGAMES.findOne({ md5: gameHash}).lean().exec()

        if ((one === undefined || one === null)) {
            await DBGAMES.create({ md5: gameHash, fens: fenMD5s })
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