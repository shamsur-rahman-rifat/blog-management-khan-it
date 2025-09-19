import { Schema, model } from 'mongoose';

const topicSchema = new Schema({
  title: String,
  keyword: String,
  instructions: String,
  month: { type: String, enum: [ 'Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'May-26', 'Jun-26','Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25']},
  project: { type: Schema.Types.ObjectId, ref: 'projects' },
  status: { type: String, enum: ['pending', 'assigned', 'completed'], default: 'assigned' },
  createdBy: String,
},{timestamps: true, versionKey: false });

export default model('topics', topicSchema);
