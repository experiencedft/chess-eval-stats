import * as fs from 'fs';
import readline from 'readline'
import * as cp from 'child_process'
import { EvaluableGame, FENObject, GameOutcome, GameOutcomeName } from './types';
import { DBFENS, DBGAMES } from './schemas';
import crypto from 'crypto'
import mongoose from 'mongoose';
import nfetch from 'node-fetch'
import logger from './logger'
import _ from 'underscore'

const MOVES: number = 10
const DEPTH = 21
const BATCH = 20

const databaseFilename = './data/test_db.pgn'
let pgns: EvaluableGame[] = []

const isClassicalGame = (pgn: string): boolean => {
    const rx = /chess\s*960|blitz|rapid|9LX|Fischer Random|titled tuesday/ig;

    const isClassical = !(rx.test(pgn));

    // if (!isClassical) {
    //     console.log(pgn)
    // }

    return isClassical;
}

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

    const positions = Array.from(pgn.matchAll(rx))
        .map((rxma) => rxma[0].replace('\n', ' ').replace('\r', ' ').replace('  ', ' '))
        .map((el) => el.replace(new RegExp("^[ {]+"), ''))
        .map((el) => el.replace(new RegExp("[ }]+$"), ''))

    // const moves = (positions.length < 20) ? positions.length : 20;
    // for (let i = 0; i < moves; i++) {
    //     if (countPositions.indexOf(positions[i]) == -1) {
    //         countPositions.push(positions[i])
    //     }
    // }

    // console.log(positions)

    if (positions.length > MOVES * 2) {
        return positions.slice(0, MOVES * 2)
    } else {
        return positions
    }
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

const extractHeader = (pgn: string): string[] => {
    let rx = /\[[^\]]+\]/g;

    const matches = pgn.matchAll(rx)

    const arrayified = Array.from(matches)

    return arrayified.map((rxma) => rxma[0].replace('\n', ''))
}

const fenMD5 = (fen: string): string => {
    const secret = "This is a secret 🤫";

    const md5Hasher = crypto.createHmac('md5', secret)

    return md5Hasher.update(fen).digest("hex");
}

const gameMD5 = (eg: EvaluableGame): string => {
    const secret = "This is a secret 🤫";

    const md5Hasher = crypto.createHmac('md5', secret)

    const fenMD5s = eg.FENs.map((el) => el.md5)

    return md5Hasher.update(fenMD5s.join() + eg.header.join()).digest("hex");
}


const pgnExtractWithTempFile = (pgn: string): EvaluableGame => {
    const tempFileName = './pgn.game.temp';
    fs.writeFileSync(tempFileName, pgn)

    const cmd = 'pgn-extract --fencomments --quiet -s ./pgn.game.temp';

    const fensedPGN = cp.execSync(cmd).toString()

    fs.unlinkSync(tempFileName)

    let eg: EvaluableGame = {
        outcome: extractGameOutcome(fensedPGN),
        FENs: extractFEN(fensedPGN).map((el) => <FENObject>{ FEN: el, md5: fenMD5(el), gameIndex: pgns.length }),
        header: extractHeader(fensedPGN),
        dirty: true
    }

    eg.md5 = gameMD5(eg)

    return eg
}

const processPGN = (pgn: string) => {
    let eg = pgnExtractWithTempFile(pgn)

    pgns.push(eg)
}

const getStockfishEval = async (fen: FENObject, depth: number): Promise<FENObject> => {
    // Uncomment here if running with Python default http.server 

    // const URL = `http://127.0.0.1:8080/cgi-bin/getLocalEvalFromFEN.py?fen=${fen}&depth=${depth}`

    // Uncomment here if running with Flask

    const URL = `http://127.0.0.1:8080?fen=${fen.FEN}&depth=${depth}`

    let res: Response = await nfetch(URL)

    let evaluation = await res.json()

    return { ...fen, eval: evaluation["eval"] }
}

const getStockfishEvals = async (fens: FENObject[], depth: number): Promise<FENObject[]> => {
    logger.info(`Retrieving ${fens.length} evals`)
    const evals: FENObject[] =
        await Promise.all(fens.map(async (fen) => await getStockfishEval(fen, depth)))

    // console.log(evals)

    return evals
}

const commitProcessedGames = async () => {
    logger.info("Committing processed games...")
    // let countDirty = 0
    // let countPartials = 0
    // let countClean = 0

    for (let eg = 0; eg < pgns.length; eg++) {
        if (pgns[eg].dirty) {
            if (_.every(pgns[eg].FENs, (fen: FENObject) => fen.eval != undefined)) {
                // countClean++
                pgns[eg].dirty = false

                const one = await DBGAMES.findOne({ md5: pgns[eg].md5 }).lean().exec()

                if ((one === undefined || one === null)) {
                    await DBGAMES.create({
                        md5: pgns[eg].md5,
                        fens: pgns[eg].FENs.map((el) => el.md5),
                        outcome: GameOutcomeName[pgns[eg].outcome]
                    })
                } else {
                    // game already saved
                    // logger.error('already saved this game: ')
                    // console.log(pgns[eg])
                }
            } else {
                // countPartials++
            }
        } else {
            // countDirty++
        }
    }

    // logger.info(`${countClean} saved, ${countPartials} partially processed, ${countDirty} dirty`)
}

const processMultipleEvals = async (batch: FENObject[]) => {
    const evaldFENs: FENObject[] = await getStockfishEvals(batch, DEPTH)

    for (let ef = 0; ef < evaldFENs.length; ef++) {
        const fenCopy = evaldFENs[ef]
        const gameIndex = evaldFENs[ef].gameIndex
        for (let ogFEN = 0; ogFEN < pgns[gameIndex].FENs.length; ogFEN++) {
            if (pgns[gameIndex].FENs[ogFEN].md5 == fenCopy.md5) {
                pgns[gameIndex].FENs[ogFEN].eval = fenCopy.eval;
                await DBFENS.create({ md5: fenCopy.md5, fen: fenCopy.FEN, eval: fenCopy.eval })
            }
        }
    }

}

const commitEvaluations = async () => {
    let aBatchOfFENs: FENObject[] = []

    let printEvery:number = 0
    if (pgns.length > 100) printEvery = Math.floor(pgns.length / 100)
    else if (pgns.length > 10) printEvery = Math.floor(pgns.length / 10)
    else printEvery = 1 

    for (let eg = 0; eg < pgns.length; eg++) {
        for (let fen = 0; fen < pgns[eg].FENs.length; fen++) {
            const one = await DBFENS.findOne({ md5: pgns[eg].FENs[fen].md5 }).lean().exec()
            if (!(one === undefined || one === null)) {
                pgns[eg].FENs[fen].eval = one.eval;
            } else {
                aBatchOfFENs.push(pgns[eg].FENs[fen])

                if (aBatchOfFENs.length == BATCH) {
                    await processMultipleEvals(aBatchOfFENs)
                    aBatchOfFENs = []
                    await commitProcessedGames()
                }
            }
        }

        if (eg % printEvery == 0) {
            logger.info(`Processed ${Math.floor(eg / (pgns.length / 100))}% of the PGNs`)
        }
    }

    if (aBatchOfFENs.length > 0) {
        await processMultipleEvals(aBatchOfFENs)
    }

    await commitProcessedGames()
}

// const commitEvaluations = async () => {
//     const onePercent = (pgns.length > 100) ? Math.floor(pgns.length / 100) : Math.floor(pgns.length / 10);
//     logger.info(`Reporting progress every ${onePercent} game(s)`)

//     for (let eg = 0; eg < pgns.length; eg++) {
//         let fenMD5s: string[] = []

//         if (Math.floor(eg % onePercent) == 0) {
//             logger.info(`${Math.floor(pgns.length / onePercent * eg)}% PGNs processed`)
//         }

//         for (let fen = 0; fen < pgns[eg].FENs.length; fen++) {
//             // console.log(pgns[eg].FENs[fen].FEN)
//             const thisFEN = pgns[eg].FENs[fen].FEN

//             const secret = "This is a secret 🤫";

//             const md5Hasher = crypto.createHmac('md5', secret)

//             const fenHash = md5Hasher.update(pgns[eg].FENs[fen].FEN).digest("hex");

//             const one = await DBFENS.findOne({ md5: fenHash }).lean().exec()

//             if (!(one === undefined || one === null)) {
//                 pgns[eg].FENs[fen].eval = one.eval;

//                 // console.log(`Found cached eval`)
//             } else {
//                 pgns[eg].FENs[fen].eval = await getStockfishEval(pgns[eg].FENs[fen].FEN, DEPTH)

//                 // console.log(`fecthed ${pgns[eg].FENs[fen].eval}`)

//                 await DBFENS.create({ md5: fenHash, fen: thisFEN, eval: pgns[eg].FENs[fen].eval })

//                 // console.log(`Stored S(eval) = ${pgns[eg].FENs[fen].eval}`)
//             }

//             fenMD5s.push(fenHash)
//         }

//         // console.log(pgns[eg].header)

//         // store the game
//         const secret = "This is a secret 🤫";

//         const md5Hasher = crypto.createHmac('md5', secret)

//         const gameHash = md5Hasher.update(fenMD5s.join() + pgns[eg].header.join()).digest("hex");

//         const one = await DBGAMES.findOne({ md5: gameHash }).lean().exec()

//         if ((one === undefined || one === null)) {
//             await DBGAMES.create({ md5: gameHash, fens: fenMD5s, outcome: GameOutcomeName[pgns[eg].outcome] })
//         }
//     }
// }


const main = () => {
    // mongod --config /usr/local/etc/mongod.conf --fork
    // use chesseval
    const mongoHost = '127.0.0.1:27017';
    const mongoDatabase = 'chesseval';
    const mongoPoolSize = 55;
    const mongoSockeTimeoutMs = 30000;
    const mongoURI = `mongodb://${mongoHost}/${mongoDatabase}`;

    (async () => {
        logger.info(`Connecting to [${mongoURI}]`)
        await mongoose.connect(`${mongoURI}`, {
            minPoolSize: mongoPoolSize,
            socketTimeoutMS: mongoSockeTimeoutMs
        })

        logger.info(`Parsing PGNs from [${databaseFilename}]`)

        const found = await PGNDatabaseParser(databaseFilename, processPGN)

        logger.info(`Read ${pgns.length} PGNs into memory`)

        await commitEvaluations()

        logger.info('All done, exiting.')

        process.exit(0)

    })();
}

main()

// parse -> prime -> eval -> commit 