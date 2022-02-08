import express, { Request, Response, Application } from 'express';
const app: Application = express();
import cors from 'cors';
import path from 'path';
require('dotenv').config();
import fetch from 'node-fetch';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const headers = {
    Authorization: 'Bearer ' + process.env.PERSONAL_ACCESS_TOKEN,
};

fetch('https://lichess.org/api/account', { headers })
    .then(res => res.json())
    .then(console.log);



const server = app.listen(3000, () => console.log(`chess-eval-stats started on port 3000`));
