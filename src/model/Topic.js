import { Schema, model } from 'mongoose';

const topicSchema = new Schema({
  title: String,
  keyword: String,
  instructions: String,
  month: { type: String},
  project: { type: Schema.Types.ObjectId, ref: 'projects' },
  status: { type: String, enum: ['pending', 'assigned', 'completed'], default: 'assigned' },
  createdBy: String,
},{timestamps: true, versionKey: false });

export default model('topics', topicSchema);
