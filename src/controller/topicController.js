// topicController.js (ES Module)

import topicModel from '../model/Topic.js';
import Article from '../model/Article.js';
import natural from 'natural';

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

export const addTopic = async (req, res) => {
  try {
    const reqBody = req.body;
    const createdBy = req.headers['email'];
    reqBody.createdBy = createdBy;
    reqBody.writerAssignedAt  = new Date();

    // Fetch existing topics for the same project
    const existingTopics = await topicModel.find({ project });

    // Check for similarity only if not forced
    if (!force && existingTopics.length > 0) {
      const tfidf = new TfIdf();
      const tokenizer = new natural.WordTokenizer();

      existingTopics.forEach(t => tfidf.addDocument(t.title));
      const newTitleTokens = tokenizer.tokenize(title.toLowerCase());

      let maxSimilarity = 0;
      let mostSimilarTitle = '';

      tfidf.documents.forEach((doc, index) => {
        const existingTokens = tokenizer.tokenize(existingTopics[index].title.toLowerCase());
        const similarity = natural.CosineSimilarity(newTitleTokens, existingTokens);

        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mostSimilarTitle = existingTopics[index].title;
        }
      });

      if (maxSimilarity > 0.8) {
        return res.status(409).json({
          message: 'Similar topic already exists.',
          similarity: maxSimilarity,
          similarTitle: mostSimilarTitle,
        });
      }
    }

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
