// userController.js (ES Module)

import userModel from '../model/User.js';
import jwt from 'jsonwebtoken';

export const registration = async (req, res) => {
  try {
    const reqBody = req.body;
    await userModel.create(reqBody);
    res.json({ status: 'Success', message: 'Registration Completed' });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const login = async (req, res) => {
  try {
    const reqBody = req.body;
    const user = await userModel.find(reqBody);
    if (user.length > 0) {
      const PayLoad = {
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        data: reqBody.email,
      };
      const token = jwt.sign(PayLoad, 'secret123');
      res.json({ status: 'Success', message: 'User Found', token });
    } else {
      res.json({ status: 'Failed', message: 'User not found' });
    }
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const profileUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const reqBody = req.body;
    await userModel.updateOne({  _id: id }, reqBody);
    res.json({ status: 'Success', message: 'Profile Updated' });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const profileDelete = async (req, res) => {
  try {
    const { id } = req.params;
    await userModel.deleteOne({ _id: id });
    res.json({ status: 'Success', message: 'Profile Deleted' });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ status: 'Failed', message: 'Email is required' });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: 'Failed', message: 'User not found' });
    }

    res.json({ status: 'Success', data: user });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const profileDetails = async (req, res) => {
  try {
    const email = req.headers['email'];
    const result = await userModel.find({ email });
    res.json({ status: 'Success', data: result });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};

export const viewUserList = async (req, res) => {
  try {
    const result = await userModel.find();
    res.json({ status: 'Success', data: result });
  } catch (error) {
    res.json({ status: 'Failed', message: error });
  }
};