import initModels from "../models/init-models.js";
import connect from "../models/connect.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import transporter from "../config/transporter.js";
import { createAccessToken, createRefreshToken } from "../config/jwt.js";
import crypto from "crypto";
import { sendMailForgotPassword } from "../utils/sendMail.js";

const models = initModels(connect);

const register = async (req, res) => {
  try {
    const { full_name, email, pass_word } = req.body;
    const userExists = await models.users.findOne({
      where: {
        email: email,
      },
    });

    if (userExists) {
      res.status(400).json({ message: "Tai khoan da ton tai" });
      return;
    }

    const hashPassword = bcrypt.hashSync(pass_word, 10);

    const result = models.users.create({
      full_name: full_name,
      email: email,
      pass_word: hashPassword,
    });

    //gui mail chao mung
    const welcomeMail = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Welcome to Our Website",
      html: `
            <h1>Welcome ${full_name} to our website</h1>
            `,
    };

    transporter.sendMail(welcomeMail, (err, info) => {
      if (err)
        return res.status(500).json({ message: "Gui mail that bai", err });
      res.status(200).json("Gui mail thanh cong");
    });

    // res.send(result.toJson())
  } catch (error) {
    res.send(error);
  }
};

const login = async (req, res) => {
  try {
    const { email, pass_word } = req.body;
    const userExists = await models.users.findOne({
      where: {
        email: email,
      },
    });

    if (!userExists) {
      res
        .status(400)
        .json({ message: "Email chua ton tai de dang ki su dung" });
      return;
    }

    const isMatch = bcrypt.compareSync(
      pass_word,
      userExists.dataValues.pass_word
    );

    console.log(pass_word, userExists.dataValues, isMatch);
    if (!isMatch) {
      res.status(400).json({ message: "Tai khoan hoac Mat khau khong hop le" });
      return;
    }

    const payload = {
      userId: userExists.user_id,
    };

    const accessToken = createAccessToken(payload);

    const refreshToken = createRefreshToken(payload);

    await prisma.users.update({
      where: {
        user_id: userExists.user_id,
      },
      data: {
        refresh_token: refreshToken,
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    res
      .status(200)
      .json({ message: "dang nhap thanh cong", token: accessToken });
  } catch (error) {
    res.send(error);
  }
};

const forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    let userExists = await models.users.findOne({
      where: {
        email,
      },
    });

    if (!userExists)
      return res
        .status(4000)
        .json({ message: "Email khong ton tai trong he thong" });

    let code = crypto.randomBytes(6).toString("hex");

    let codeForgotPassExists = await models.forgot_password_code.findOne({
      where: {
        user_id: userExists.user_id,
      },
    });

    const mailContent = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Code xac thuc",
      html: `
              <h1>${code}</h1>
              `,
    };

    console.log(code);
    if (codeForgotPassExists) {
      await models.forgot_password_code.update(
        {
          forgot_code: code,
        },
        {
          where: {
            user_id: userExists.user_id,
          },
        }
      );

      sendMailForgotPassword(res, mailContent);
    } else {
      let expired = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      await models.forgot_password_code.create({
        user_id: userExists.user_id,
        forgot_code: code,
        expired: expired,
      });
      sendMailForgotPassword(res, mailContent);
    }
  } catch (error) {
    return res.status(500).json({ message: "Error API ForgotPassword" });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { email, code, newPassword } = req.body;

    let userExists = await models.users.findOne({
      where: { email },
    });

    if (!userExists)
      return res.status(400).json({ message: "Khong tim thay user" });

    let codeExists = await models.forgot_password_code.findOne({
      where: {
        user_id: userExists.user_id,
        forgot_code: code,
      },
    });

    if (!codeExists)
      return res.status(400).json({ message: "Code khong hop le" });

    let hashNewPassword = bcrypt.hashSync(newPassword, 10);

    console.log("hellooooo: ", hashNewPassword);
    await models.users.update(
      {
        pass_word: hashNewPassword,
      },
      {
        where: {
          user_id: userExists.user_id,
        },
      }
    );

    // xóa code trong db
    await models.forgot_password_code.destroy({
      where: {
        user_id: userExists.user_id,
      },
    });

    return res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    return res.status(500).json({ message: "Error API", error });
  }
};

const loginFacebook = async (req, res) => {
  try {
    // 1 - Nhận dữ liệu: email, id, name của facebook
    let { id, email, name } = req.body;

    // 2 - Kiểm tra email có tồn tại trong db hay không
    let userExist = await models.users.findOne({
      where: { email },
    });

    // TH1: email không tồn tại trong db
    // tạo user mới
    // send mail welcome
    // tạo access token,
    // trả về cho FE
    if (!userExist) {
      let newUser = await models.users.create({
        full_name: name,
        email,
        pass_word: " ",
        face_app_id: id,
      });
      const mailOption = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Welcome to Our Website",
        html: `
              <h1>Welcome ${name} to Our Website</h1>
           `,
      };
      return transporter.sendMail(mailOption, (err, info) => {
        if (err) {
          return res.status(500).json({ message: "Gửi mail thất bại" });
        }

        // tạo access token cho user
        let payload = {
          userId: newUser.user_id,
        };
        let accessToken = createAccessToken(payload);
        return res
          .status(200)
          .json({ message: "Đăng nhập thành công", token: accessToken });
      });
    }

    // TH2: email đã tồn tại trong db
    // kiểm tra user có face_app_id hay không
    // nếu có thì trả về access token
    // nếu không thì báo lỗi, yêu cầu đăng nhập bằng email
    if (!userExist.face_app_id) {
      return res.status(400).json({ message: "Vui lòng đăng nhập bằng email" });
    }

    // tạo access token cho user
    let payload = {
      userId: userExist.user_id,
    };
    let accessToken = createAccessToken(payload);
    return res
      .status(200)
      .json({ message: "Đăng nhập thành công", token: accessToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error API loginFacebook" });
  }
};

const extendToken = async (req, res) => {
  try {
    let refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });

    let user = await prisma.users.findFirst({
      where: {
        refresh_token: refreshToken,
      },
    });

    let payload = {
      userId: user.user_id,
    };
    let newAccessToken = createAccessToken(payload);
    return res
      .status(200)
      .json({ message: "Extend token success", token: newAccessToken });
  } catch (error) {
    return res.status(500).json({ message: "Error API extendToken" });
  }
};

export {
  register,
  login,
  forgotPassword,
  resetPassword,
  loginFacebook,
  extendToken,
};
