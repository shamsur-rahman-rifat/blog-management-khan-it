// Basic Library Imports
import express, { json, urlencoded } from 'express';
import router from './src/route/api.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import { connect } from 'mongoose';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();
const app=new express();
const __dirname = resolve();

// Middleware

app.use(cors());
app.use(helmet());
app.use(hpp());
app.use(json({ limit: "20MB" }));
app.use(urlencoded({extended: true}));
const limiter = rateLimit({ windowMs: 15*60*1000, max: 3000 });
app.use(limiter);

// MongoDB connection

let URL= process.env.MONGO_URL;
let Option={user:'',pass:'',autoIndex:true}
connect(URL,Option).then(()=>{
    console.log("Database Connected")
}).catch((err)=>{
    console.log(err)
})

// API routes

app.use("/api", router);

app.use(express.static('client/dist'));

// Serve React front end for all routes not handled by the API
app.get(/(.*)/, (req, res) => {
    res.sendFile(resolve(__dirname, 'client', 'dist', 'index.html'));
});

export default app;