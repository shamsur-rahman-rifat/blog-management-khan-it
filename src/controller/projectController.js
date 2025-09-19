import projectModel from '../model/Project.js';
import sendEmail from '../utility/sendEmail.js';

// Helper: Send notification email
const sendProjectNotification = async (action, project) => {
  const { name: projectName, writer, manager } = project;

  let subject = '';
  let text = '';

  switch (action) {
    case 'added':
      subject = 'New Project Assigned';
      text = `A new project titled "${projectName}" has been added to the system.`;
      break;
    case 'updated':
      subject = 'Project Updated';
      text = `The project titled "${projectName}" has been updated.`;
      break;
    case 'deleted':
      subject = 'Project Deleted';
      text = `The project titled "${projectName}" has been deleted from the system.`;
      break;
    default:
      return;
  }

  try {
    // Send email to writer if email exists
    if (writer?.email) {
      await sendEmail(writer.email, subject, text);
      console.log(`Email sent to writer: ${writer.email}`);
    } else {
      console.warn('Writer email not found, skipping email.');
    }

    // Send email to manager if email exists
    if (manager?.email) {
      await sendEmail(manager.email, subject, text);
      console.log(`Email sent to manager: ${manager.email}`);
    } else {
      console.warn('Manager email not found, skipping email.');
    }
  } catch (err) {
    console.error('Failed to send project notification emails:', err);
  }
};

// Add Project
export const addProject = async (req, res) => {
  try {
    const reqBody = req.body;
    const createdBy = req.headers['email'];
    reqBody.createdBy = createdBy;

    const newProject = await projectModel.create(reqBody);

    const populatedProject = await projectModel.findById(newProject._id)
      .populate('writer', 'email')
      .populate('manager', 'email');

    await sendProjectNotification('added', populatedProject);

    res.json({ status: 'Success', message: 'Project Added' });
  } catch (error) {
    res.json({ status: 'Failed', message: error.message });
  }
};

// View Project List
export const viewProjectList = async (req, res) => {
  try {
    const result = await projectModel.find()
      .populate('writer', 'name email')
      .populate('manager', 'name email');

    res.json({ status: 'Success', data: result });
  } catch (error) {
    res.json({ status: 'Failed', message: error.message });
  }
};

// Update Project
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const reqBody = req.body;

    await projectModel.updateOne({ _id: id }, reqBody);

    const updatedProject = await projectModel.findById(id)
      .populate('writer', 'email')
      .populate('manager', 'email');

    await sendProjectNotification('updated', updatedProject);

    res.json({ status: 'Success', message: 'Project Updated' });
  } catch (error) {
    res.json({ status: 'Failed', message: error.message });
  }
};

// Delete Project
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const projectToDelete = await projectModel.findById(id)
      .populate('writer', 'email')
      .populate('manager', 'email');

    if (!projectToDelete) {
      return res.json({ status: 'Failed', message: 'Project not found' });
    }

    await projectModel.deleteOne({ _id: id });

    await sendProjectNotification('deleted', projectToDelete);

    res.json({ status: 'Success', message: 'Project Deleted' });
  } catch (error) {
    res.json({ status: 'Failed', message: error.message });
  }
};
