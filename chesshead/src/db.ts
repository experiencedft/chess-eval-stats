import mongoose from 'mongoose';

export const connectMongoose = async ({ mongoUri }) => {
    if (mongoose?.connections?.[0].readyState) {
        return
    }

    return mongoose.connect(mongoUri, {
        minPoolSize: 10,
        socketTimeoutMS: 30000
    })
}


export class PositionsDatabase {
    
}



export const resolveFEN = (fen: string) => {

}