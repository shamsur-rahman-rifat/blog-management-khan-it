import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  roles: {    
    type: [String],
    enum: ['admin', 'writer', 'manager']}
},{timestamps: true, versionKey: false});

export default model('users', userSchema);