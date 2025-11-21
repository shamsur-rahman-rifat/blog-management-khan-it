// articleController.js

import articleModel from '../model/Article.js';
import userModel from '../model/User.js';

export const viewArticleList = async (req, res) => {
  try {
    const articles = await articleModel.find()
      .populate('topic', 'title keyword instructions project') // Populate topic with selected fields

    res.json({ status: 'Success', data: articles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'Failed', message: error.message });
  }
};

export const viewPublishedArticles = async (req, res) => {
  try {
    const publishedArticles = await articleModel.find({ status: 'published' })
      .populate({
        path: 'topic',
        select: 'title project',
        populate: {
          path: 'project',
          select: 'name',
        }
      })
      .select('publishLink publishedAt topic')
      .sort({ publishedAt: -1 });

    // Format data for API output
    const formattedData = publishedArticles.map(article => ({
      id: article.id,
      projectName: article.topic?.project?.name || 'N/A',
      topicTitle: article.topic?.title || 'N/A',
      publishLink: article.publishLink,
      publishedAt: article.publishedAt
        ? article.publishedAt.toISOString().split('T')[0]
        : 'N/A',
    }));

    res.json({ status: 'Success', data: formattedData });
  } catch (error) {
    console.error('Error fetching published articles:', error);
    res.status(500).json({ status: 'Failed', message: error.message });
  }
};

export const updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers["email"];
    const updateData = req.body;

    const article = await articleModel.findById(id);
    if (!article) {
      return res.status(404).json({ status: "Failed", message: "Article not found" });
    }

    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      return res.status(403).json({ status: "Failed", message: "User not found" });
    }

    const isWriter = user.roles.includes("writer");
    const isManager = user.roles.includes("manager")
    const isAdmin = user.roles.includes("admin");

    // ✅ Writer or admin can update content link
    if ((isWriter || isAdmin || isManager) && updateData.contentLink) {
      if (!isAdmin && article.status === "published") {
        return res.status(400).json({ status: "Failed", message: "Cannot update a published article." });
      }

      article.contentLink = updateData.contentLink;
      article.status = "submitted";
      article.writerSubmittedAt = article.writerSubmittedAt || new Date();
    }

    // Manager or admin can update publish link
    if ((isManager || isAdmin) && updateData.publishLink) {

      // If contentLink is missing, auto-assign publishLink into contentLink
      if (!article.contentLink) {
        article.contentLink = updateData.publishLink;
        article.writerSubmittedAt = article.writerSubmittedAt || new Date();
        article.status = "submitted"; // Move it to submitted first (optional)
      }

      // Now publish it
      article.publishLink = updateData.publishLink;
      article.status = "published";
      article.publisher = article.publisher || userEmail;
      article.publishedAt = new Date();
    }

    // ✅ Manager or admin can set status to 'revision'
    if ((isManager || isAdmin) && updateData.status === "revision") {
      article.status = "revision";
      article.contentLink = ""; // Clear content link
    }

    await article.save();
    return res.json({ status: "Success", message: "Article updated" });

  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ status: "Failed", message: "Internal server error" });
  }
};

export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.headers["email"];

    const user = await userModel.findOne({ email: userEmail });
    if (!user) {
      return res.status(403).json({ status: "Failed", message: "User not found" });
    }

    const article = await articleModel.findById(id);
    if (!article) {
      return res.status(404).json({ status: "Failed", message: "Article not found" });
    }

    const isWriter = article.writer === userEmail;
    const isAdmin = user.roles.includes("admin");

    if (!isWriter && !isAdmin) {
      return res.status(403).json({ status: "Failed", message: "Unauthorized" });
    }

    await article.deleteOne();
    return res.json({ status: "Success", message: "Article Deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ status: "Failed", message: "Internal server error" });
  }
};