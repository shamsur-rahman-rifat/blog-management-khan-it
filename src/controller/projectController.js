import projectModel from '../model/Project.js';

export const addProject = async (req, res) => {
  try {
    const reqBody = req.body;
    const createdBy = req.headers['email'];
    reqBody.createdBy = createdBy;
    await projectModel.create(reqBody);
    res.json({ status: 'Success', message: 'Project Added' });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const viewProjectList = async (req, res) => {
  try {
    const result = await projectModel.find();
    res.json({ status: 'Success', data: result });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const updateProject = async (req, res) => {
  try {
    const reqBody = req.body;
    const { id } = req.params;
    await projectModel.updateOne({ _id: id }, reqBody);
    res.json({ status: 'Success', message: 'Project Updated' });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await projectModel.deleteOne({ _id: id });
    res.json({ status: 'Success', message: 'Project Deleted' });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};
