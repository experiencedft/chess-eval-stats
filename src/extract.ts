import * as fs from 'fs';
import readline from 'readline'
import * as cp from 'child_process'

const MOVES:number = 10

export const PGNDatabaseParser = async (filename: string, callback: (pgn: string) => void): Promise<void> => {
    let currentPGN: string = ""
    let pgnCounter: number = 0

    const rl = readline.createInterface({
        input: fs.createReadStream(filename)
    })

    rl.on('line', (line: string) => {
        if (line.startsWith('[Event ')) {
            pgnCounter++

            if (currentPGN.length > 0) {
                callback(currentPGN);
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

const fenExtract = (pgn: string): string[] => {
    let rx = /{[^}]+}/g;

    return Array.from(pgn.matchAll(rx)).map((rxma) => rxma[0].replace('\n', ''))
        .map((el) => el.replace(new RegExp("^[ {]+"), ''))
        .map((el) => el.replace(new RegExp("[ }]+$"), ''))
}

const pgnExtract = (pgn: string, callback: (res: string[]) => void) => {
    const cmd = 'pgn-extract';
    const args = ['--fencomments']
    let sub = cp.spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    sub.stdin.write(pgn)

    sub.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    sub.stdout.on('data', (data) => {
        callback(fenExtract(data.toString()))

        sub.kill()
    })
};

const processPGN = async (pgn: string): Promise<void> => {
    pgnExtract(pgn, (data) => {
        console.log(data)
    })
}

PGNDatabaseParser('./data/test_db.pgn', processPGN)