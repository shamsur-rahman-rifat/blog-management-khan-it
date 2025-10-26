import { Router } from 'express';
import {
  registration,
  login,
  profileUpdate,
  profileDelete,
  profileDetails,
  viewUserList,
  getUserByEmail
} from '../controller/userController.js';

import {
  addProject,
  viewProjectList,
  updateProject,
  deleteProject
} from '../controller/projectController.js';

import {
  addTopic,
  viewTopicList,
  updateTopic,
  deleteTopic
} from '../controller/topicController.js';

import {
  viewArticleList,
  updateArticle,
  viewPublishedArticles,
  deleteArticle
} from '../controller/articleController.js';

import { getDashboardData } from '../controller/dashboardController.js';

import Authentication from '../middleware/auth.js';
import checkRole from '../middleware/checkRole.js';

const router = Router();

// 🔐 Auth & User Routes

router.post('/registration', registration);
router.post('/login', login);

router.put('/profileUpdate/:id', Authentication, profileUpdate);
router.delete('/profileDelete/:id', Authentication, profileDelete);
router.post('/profileDetails', Authentication, profileDetails);

// ✅ Allow both admin and manager to view users
router.get('/viewUserList', Authentication, checkRole('admin', 'manager', 'writer'), viewUserList);
router.post('/getUserByEmail/:email', Authentication, getUserByEmail);

// 📁 Project Routes

router.post('/addProject', Authentication, checkRole('admin'), addProject);
router.get('/viewProjectList', Authentication, checkRole('admin', 'manager', 'writer'), viewProjectList);
router.put('/updateProject/:id', Authentication, checkRole('admin'), updateProject);
router.delete('/deleteProject/:id', Authentication, checkRole('admin'), deleteProject);

// 📝 Topic Routes

// ✅ Managers can assign/edit topics too
router.post('/addTopic', Authentication, checkRole('admin', 'manager'), addTopic);
router.get('/viewTopicList', Authentication, checkRole('admin', 'manager', 'writer'), viewTopicList);
router.put('/updateTopic/:id', Authentication, checkRole('admin', 'manager'), updateTopic);
router.delete('/deleteTopic/:id', Authentication, checkRole('admin', 'manager'), deleteTopic);

// 📄 Article Routes

// ✅ If articles should be visible to writer & manager
router.get('/viewArticleList', Authentication, checkRole('admin', 'writer', 'manager'), viewArticleList);
router.get('/viewPublishedArticles', Authentication, checkRole('admin'), viewPublishedArticles);
router.put('/updateArticle/:id', Authentication, checkRole('admin', 'writer', 'manager'), updateArticle);
router.delete('/deleteArticle/:id', Authentication, checkRole('admin', 'manager'), deleteArticle);


// 📊 Dashboard Route

router.get('/getDashboardData', Authentication, checkRole('admin', 'writer', 'manager'), getDashboardData);

export default router;