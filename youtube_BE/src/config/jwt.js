import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const prisma = new PrismaClient();

const createAccessToken = (payload) => {
  return jwt.sign({ payload }, process.env.SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: "2h",
  });
};

const createRefreshToken = (payload) => {
  return jwt.sign({ payload }, process.env.SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
};

const verifyAccessToken = (accessToken) => {
  try {
    const payload = jwt.verify(accessToken, process.env.SECRET_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

const middlewareToken = async (req, res, next) => {
  let { token } = req.headers;
  //truong hop 1: khong co token
  if (!token) {
    return res.status(401).json({ message: "Authorized" });
  }
  //truong hop 2: token khong hop le
  let checkToken = verifyAccessToken(token);
  if (checkToken) {
    return res.status(401).json({ message: "Authorized" });
  }

  let userId = checkToken.payload.userId;

  let user = await prisma.users.findFirst({
    where: {
      user_id: userId,
    },
  });

  if (!user) return res.status(401).json({ message: "Unauthorized" });

  req.userId = userId;

  //TH3: token hop le
  next();
};

export {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  middlewareToken,
};
