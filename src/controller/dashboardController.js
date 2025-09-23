import Topic from '../model/Topic.js';
import Article from '../model/Article.js';
import Project from '../model/Project.js';  // import your Project model
import User from '../model/User.js'; // to find user by email

export const getDashboardData = async (req, res) => {
  try {
    const email = req.headers.email;  // email set by auth middleware

    // Find user by email to get user ID
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({ status: 'Failed', message: 'User not found' });
    }
    
    // Step 1: Get topics with nested project + user names
    const topics = await Topic.find()
      .populate({
        path: 'project',
        select: 'name writer manager private',
        populate: [
          { path: 'writer', select: 'name' },
          { path: 'manager', select: 'name' }
        ]
      })
      .lean();

    // Step 2: Get all relevant articles
    const topicIds = topics.map(t => t._id);
    const articles = await Article.find({ topic: { $in: topicIds } }).lean();

    // Step 3: Create map of articles
    const articleMap = {};
    for (const article of articles) {
      articleMap[article.topic.toString()] = article;
    }

    // Step 4: Count projects assigned to this user if manager role
    let projectsAssignedCount = 0;
    if (user.roles.includes('manager')) {
      projectsAssignedCount = await Project.countDocuments({ manager: user._id });
    }    

    // Step 4: Combine topic + project + writer/manager + article data
    const dashboardData = topics.map(topic => {
      const article = articleMap[topic._id.toString()] || {};
      const project = topic.project || {};
      const manager = project.manager || {};
      const writer = project.writer || {};

      return {
        project: project.name || 'N/A',
        projectType: project.private ? 'Private' : 'Public',
        managerName: manager.name || 'N/A',
        writerName: writer.name || 'N/A',
        topic: topic.title,
        month: topic.month,
        status: article.status,
        writerAssignedAt: topic.createdAt
          ? topic.createdAt.toISOString().split('T')[0]
          : null,
        writerSubmittedAt: article.writerSubmittedAt
          ? new Date(article.writerSubmittedAt).toISOString().split('T')[0]
          : null,
        publishedAt: article.publishedAt
          ? new Date(article.publishedAt).toISOString().split('T')[0]
          : null,
      };
    });   

    res.json({ status: 'Success', data: dashboardData, projectsAssignedCount  });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    res.status(500).json({ status: 'Failed', message: err.message });
  }
};
