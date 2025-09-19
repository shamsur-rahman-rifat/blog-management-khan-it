// topicController.js (ES Module)

import topicModel from '../model/Topic.js';
import Article from '../model/Article.js';
import sendEmail from '../utility/sendEmail.js';


// Helper: Send notification email to the project's writer linked to the topic
const sendWriterNotification = async (action, topic) => {
  // Populate project.writer to get writer email
  const populatedTopic = await topicModel.findById(topic._id)
    .populate({
      path: 'project',
      populate: { path: 'writer', select: 'email name' }
    });

  if (!populatedTopic?.project?.writer?.email) {
    console.error('Writer email not found. Skipping email notification.');
    return;
  }

  const writerEmail = populatedTopic.project.writer.email;
  const writerName = populatedTopic.project.writer.name || 'Writer';
  const topicTitle = populatedTopic.title || 'the topic';

  let subject = '';
  let text = '';

  switch (action) {
    case 'added':
      subject = 'New Topic Assigned';
      text = `Hello ${writerName},\n\nA new topic titled "${topicTitle}" has been assigned to you.\nPlease check your dashboard for details.`;
      break;
    case 'updated':
      subject = 'Topic Updated';
      text = `Hello ${writerName},\n\nThe topic titled "${topicTitle}" has been updated.\nPlease review the changes.`;
      break;
    case 'deleted':
      subject = 'Topic Deleted';
      text = `Hello ${writerName},\n\nThe topic titled "${topicTitle}" has been deleted from the system.`;
      break;
    default:
      return;
  }

  try {
    await sendEmail(writerEmail, subject, text);
    console.log(`Notification email sent to writer (${writerEmail}) for topic "${topicTitle}"`);
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }
};

export const addTopic = async (req, res) => {
  try {
    const reqBody = req.body;
    const createdBy = req.headers['email'];
    reqBody.createdBy = createdBy;
    reqBody.writerAssignedAt = new Date();

    // Create the topic
    const createdTopic = await topicModel.create(reqBody);

    // Automatically create an article linked to the topic
    const newArticle = new Article({
      topic: createdTopic._id,
      status: 'assigned',
    });
    await newArticle.save();

    // Send notification email to writer
    await sendWriterNotification('added', createdTopic);

    res.json({ status: 'Success', message: 'Topic and Article Added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'Failed', message: error.message || error });
  }
};

export const viewTopicList = async (req, res) => {
  try {
    const result = await topicModel
      .find()
      .populate('project', 'name word writer manager');

    res.json({ status: 'Success', data: result });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const result = await topicModel.updateOne({ _id: id }, updatedData);

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ status: 'Failed', message: 'Topic not found or no changes made' });
    }

    // Get updated topic for notification
    const updatedTopic = await topicModel.findById(id);

    // Send notification email to writer
    await sendWriterNotification('updated', updatedTopic);

    res.json({ status: 'Success', message: 'Topic updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'Failed', message: error.message || error });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const createdBy = req.headers['email'];

    // Find the topic before deleting for notification
    const topicToDelete = await topicModel.findOne({ _id: id, createdBy });

    if (!topicToDelete) {
      return res.status(404).json({ status: 'Failed', message: 'Topic not found or unauthorized' });
    }

    await topicModel.deleteOne({ _id: id, createdBy });

    // Send notification email to writer
    await sendWriterNotification('deleted', topicToDelete);

    res.json({ status: 'Success', message: 'Topic Deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'Failed', message: error });
  }
};