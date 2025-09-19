import { Schema, model } from 'mongoose';

const articleSchema = new Schema({
  topic: { type: Schema.Types.ObjectId, ref: 'topics' },
  writerSubmittedAt: { type: Date },
  publishedAt: { type: Date },
  contentLink: { type: String },
  publishLink: { type: String },
  status: { type: String, enum: ['revision', 'submitted', 'published', 'assigned'], default: 'assigned' }  
}, {timestamps: true, versionKey: false });

export default model('articles', articleSchema);
