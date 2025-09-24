import { Schema, model } from 'mongoose';

const projectSchema = new Schema({
  name: { type: String, required: true }, 
  word: { type: Number }, 
  private: { type: Boolean, default: false }, 
  status: { type: String, enum: ['ongoing', 'paused'], default: 'ongoing' },
  writer: { type: Schema.Types.ObjectId, ref: 'users' },
  manager: { type: Schema.Types.ObjectId, ref: 'users' },  
  createdBy: String,
},{timestamps: true, versionKey: false});

export default model('projects', projectSchema);