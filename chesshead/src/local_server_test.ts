import fetch from 'node-fetch'

const FEN =  "rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3"

const fetchEvaluationFromPython = async (fen : string, depth: number): Promise<number> => {
    let res = await fetch("http://127.0.0.1:8080/cgi-bin/getLocalEvalFromFEN.py?fen="+fen+"&depth="+depth.toString())
    let evaluation = await res.json()
    console.log(evaluation)
    console.log(evaluation["eval"])
    return evaluation["eval"]
}

fetchEvaluationFromPython(FEN, 21)

// let evaluation = {}

// fetch("http://127.0.0.1:8080/cgi-bin/getLocalEvalFromFEN.py?fen="+"rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3"+"&depth=21").then((res) => res.json()).then(data => console.log(data))