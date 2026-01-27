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
app.set('trust proxy', 1);

// Middleware

app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.cloudinary.com"],
        scriptSrc: ["'self'", "https://widget.cloudinary.com"], // if using Cloudinary widget
        imgSrc: ["'self'", "https://res.cloudinary.com"], // images from Cloudinary
        styleSrc: ["'self'", "'unsafe-inline'"], // if inline styles are used
        objectSrc: ["'none'"],
      },
    },
  })
);
app.use(hpp());
app.use(json({ limit: "20MB" }));
app.use(urlencoded({extended: true}));
const limiter = rateLimit({ windowMs: 15*60*1000, max: 3000 });
app.use(limiter);

// MongoDB connection

let URL= process.env.MONGO_URL;
connect(URL)
  .then(() => console.log("Database Connected"))
  .catch(err => console.log(err));

// API routes

app.use("/api", router);


// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all other routes (SPA support)
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export default app;