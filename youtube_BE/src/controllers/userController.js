import connect from "../../db.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getUsers(req, res) {
  try {
    const [data] = await connect.query(`
        SELECT * FROM users
    `);
    return res.send(data);
  } catch (error) {
    return res.send(`Error: ${error}`);
  }
}

async function createUser(req, res) {
  try {
    const queryString = `INSERT INTO users (full_name, email, pass_word) VALUES
        (?, ?, ?)`;
    const body = req.body;
    const { full_name, email, pass_word } = body;
    const [data] = await connect.execute(queryString, [
      full_name,
      email,
      pass_word,
    ]);

    return res.send(data);
  } catch (error) {
    return res.send(`Error: ${error}`);
  }
}

const uploadAvatar = async (req, res) => {
  try {
    let file = req.file;
    return res.status(200).json(file);
  } catch (error) {
    return res.status(500).json({ message: "Error upload avatar" });
  }
};

const uploadMultipleImgs = async (req, res) => {
  try {
    let files = req.files;
    return res.status(200).json(files);
  } catch (error) {
    return res.status(500).json({ message: "Error upload multiple images" });
  }
};

const uploadAvatarCloud = async (req, res) => {
  try {
    let file = req.file;
    return res.status(200).json(file);
  } catch (error) {
    return res.status(500);
  }
};

const getUserProfile = async (req, res) => {
  try {
    let userId = req.userId;
    let user = await prisma.users.findFirst({
      where: {
        user_id: userId,
      },
    });

    let response = user;
    if (user.avatar) {
      response = {
        ...user,
        avatar: `${process.env.BASE_URL}/public/images/${user.avatar}`,
      };
    }
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({ message: "Error get user profile" });
  }
};

export {
  getUsers,
  createUser,
  uploadAvatar,
  uploadMultipleImgs,
  uploadAvatarCloud,
  getUserProfile,
};
