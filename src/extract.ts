import * as fs from 'fs';
import readline from 'readline'
import * as cp from 'child_process'

const MOVES: number = 10

const isClassicalGame = (pgn: string): boolean => {
    const rx = /chess\s*960|blitz|rapid|9LX|Fischer Random|titled tuesday/ig;

    const isClassical = !(rx.test(pgn));

    // if (!isClassical) {
    //     console.log(pgn)
    // }

    return isClassical;
}

const PGNDatabaseParser = (filename: string, callback: (pgn: string) => void) => {
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

    rl.on('close', () => {
        console.log(`found ${pgnCounter} games`)
    })
}

let countPositions: string[] = []

const fenExtract = (pgn: string): string[] => {
    let rx = /{[^}]+}/g;

    const positions = Array.from(pgn.matchAll(rx)).map((rxma) => rxma[0].replace('\n', ''))
        .map((el) => el.replace(new RegExp("^[ {]+"), ''))
        .map((el) => el.replace(new RegExp("[ }]+$"), ''))

    // for (let i = 0; i < positions.length; i++) {
    //     if (countPositions.indexOf(positions[i]) == -1) {
    //         countPositions.push(positions[i])
    //     }
    // }

    const moves = (positions.length < 20) ? positions.length : 20;

    for (let i = 0; i < moves; i++) {
        if (countPositions.indexOf(positions[i]) == -1) {
            countPositions.push(positions[i])
        }
    }

    return positions
}


const pgnExtractWithTempFile = (pgn: string, callback: (res: string[]) => void) => {
    const tempFileName = './pgn.game.temp';
    fs.writeFileSync(tempFileName, pgn)

    const cmd = 'pgn-extract --fencomments --quiet -s ./pgn.game.temp';

    const fensedPGN = cp.execSync(cmd)

    fs.unlinkSync(tempFileName)

    callback(fenExtract(fensedPGN.toString()))
}

const processPGN = (pgn: string) => {
    pgnExtractWithTempFile(pgn, (data) => {
        // console.log(data)
        console.log(`unique positions: ${countPositions.length}`)
    })

    // pgnExtract(pgn, (data) => {
    //     // console.log(data)
    // })
}

// PGNDatabaseParser('./data/test_db.pgn', processPGN)


const main = () => {
    PGNDatabaseParser('./data/test_db.pgn', processPGN)
    // process.exit(0)
}

main()