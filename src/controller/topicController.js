// topicController.js (ES Module)

import topicModel from '../model/Topic.js';
import Article from '../model/Article.js';

export const addTopic = async (req, res) => {
  try {
    const reqBody = req.body;
    const createdBy = req.headers['email'];
    reqBody.createdBy = createdBy;
    reqBody.writerAssignedAt  = new Date();

    // Create the topic
    const createdTopic = await topicModel.create(reqBody);

    // Automatically create an article linked to the topic
    const newArticle = new Article({
      topic: createdTopic._id,
      status: 'assigned', // default status or adjust as needed
    });

    await newArticle.save();

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
      .populate('project', 'name word writer manager')

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
    await topicModel.deleteOne({ _id: id, createdBy });
    res.json({ status: 'Success', message: 'Topic Deleted' });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};
