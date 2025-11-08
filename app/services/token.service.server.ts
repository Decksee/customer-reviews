/* eslint-disable @typescript-eslint/no-explicit-any */

import Token, {
  type IToken,
  type ITokenMethods,
  type TokenModel,
} from "~/core/entities/token.entity.server";
import { BaseService } from "~/core/abstracts/service.server";
import config from "~/config/config.server";
import { userService } from "./user.service.server";
import { logger } from "~/core/utils/logger.server";
import moment, { type Moment } from "moment";
import jwt from "jsonwebtoken";
import { type IUser } from "~/core/entities/user.entity.server";
export default class TokenService extends BaseService<
  IToken,
  ITokenMethods,
  TokenModel
> {
  constructor() {
    super(Token);
  }

  private static instance: TokenService;

  public static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Reset password of a user
   *
   * @param {string} resetPasswordToken The reset password token sent to the user email
   * @param {string} newPassword The new user password as raw string not hashed (hashing is done in the user model)
   * @returns {Promise<any>} The promise resolves when the password is reset
   */
  async resetPassword(
    resetPasswordToken: string,
    newPassword: string
  ): Promise<any> {
    try {
      console.log('Got password: ', newPassword)
      console.log('Got token: ', resetPasswordToken)
      const resetPasswordTokenDoc = await this.verifyToken(
        resetPasswordToken,
        config.auth.tokenTypes.RESET_PASSWORD
      );
      console.log('Got token doc after verify token succeed: ', resetPasswordTokenDoc)
      const user = await userService.readOne({
        id: resetPasswordTokenDoc.user,
      });
      if (!user) {
        throw new Error("No user found to reset password");
      }

      const newUser = await userService.updateOne(user.id, {
        password: newPassword,
      });
      await this.deleteMany({
        user: user.id,
        type: config.auth.tokenTypes.RESET_PASSWORD,
      });

      return newUser;
    } catch (error) {
      logger.error("AuthService: resetPassword: ", error);
      throw new Error("Password reset failed");
    }
  }

  /**
   * Reset pin of a user
   *
   * @param {string} resetPINToken The reset pin token sent to the user email
   * @param {string} newPin The new user pin as raw string not hashed (hashing is done in the user model)
   * @returns {Promise<any>} The promise resolves when the pin is reset
   */
  async resetPIN(resetPINToken: string, newPin: string): Promise<any> {
    try {
      const resetPINTokenDoc = await this.verifyToken(
        resetPINToken,
        config.auth.tokenTypes.RESET_PIN
      );
      const user = await userService.readOne({
        id: resetPINTokenDoc.user,
      });
      if (!user) {
        throw new Error("No user found to reset password");
      }

      const newUser = await userService.updateOne(user.id, { pin: newPin });
      await this.deleteMany({
        user: user.id,
        type: config.auth.tokenTypes.RESET_PIN,
      });

      return newUser;
    } catch (error) {
      logger.error("AuthService: resetPIN: ", error);
      throw new Error("PIN reset failed");
    }
  }

  /**
   * Generate a token. It can be in different type
   *
   * @param {IUser} user The global user object
   * @param {Moment} expires The expiration date of the token
   * @param {string} type The type of token to generate
   * @param {string} [secret] The secret to use to generate the token
   * @returns {string} The generated token
   */
  async generateToken(
    user: IUser,
    expires: Moment,
    type: string,
    secret: string = config.jwt.secret
  ) {
    // Ensure to delete all previous tokens for this user for this type
    await Token.deleteMany({ user: user.id, type: type });


    // const payload = {
    //   sub: user.id, // Main user id
    //   iat: moment().unix(),
    //   exp: expires.unix(),
    //   type,
    // };

    // exp should correspond to config token expiration of each token type
    const pinResetExpiration = config.jwt.resetPINExpirationMinutes;
    const passwordResetExpiration = config.jwt.resetPasswordExpirationMinutes;
    const verifyEmailExpiration = config.jwt.verifyEmailExpirationMinutes;

    let exp;
    switch (type) {
      case config.auth.tokenTypes.RESET_PIN:
        exp = pinResetExpiration;
        break;
      case config.auth.tokenTypes.RESET_PASSWORD:
        exp = passwordResetExpiration;
        break;
      case config.auth.tokenTypes.VERIFY_EMAIL:
        exp = verifyEmailExpiration;
        break;
      default:
        throw new Error("Invalid token type");
    }

    const payload = {
      sub: user.id, // Main user id
      iat: moment().unix(),
      exp: moment().add(exp, "minutes").unix(),
      type,
    };
    return jwt.sign(payload, secret);
  }

  /**
   * Delete all invite tokens  for a user
   *
   * @param userId The user id in main context
   * @param type The type of token to delete
   * @returns {Promise<Token>} The deleted token
   */
  async findAndDeleteTokensByType(userId: string, type: string) {
    return await Token.deleteMany({
      user: userId,
      type,
    });
  }

  /**
   * Save a token into the main db
   *
   * @param {string} token The token to save
   * @param {IUser} user The global user object
   * @param {Moment} expires The expiration date of the token
   * @param {string} type The type of token to save
   * @param {boolean} blacklisted Is the token blacklisted
   * @returns {Promise<Token>} The saved token
   */
  async saveToken(
    token: string,
    user: IUser,
    expires: Moment,
    type: string,
    blacklisted = false
  ) {
    // Ensure to delete all previous tokens for this user for this type
    await Token.deleteMany({ user: user.id, type });

    const tokenDoc = await Token.create({
      token,
      user: user.id,
      expires: expires.toDate(),
      type,
      blacklisted,
    });
    return tokenDoc;
  }

  /**
   * Verify token and return token doc (or throw an error if it is not valid)
   * @param {string} token
   * @param {string} type
   * @returns {Promise<Token>}
   */
  async verifyToken(token: string, type: string) {
    console.log("In verify token with: ", token, type);
    const payload = jwt.verify(token, config.jwt.secret);
    const tokenDoc = await Token.findOne({
      token,
      type,
      user: payload.sub,
      blacklisted: false,
    });
    if (!tokenDoc) {
      throw new Error("Token to verify not found");
    }
    return tokenDoc;
  }

  /**
   * From config:
   * public jwt: {
    secret: string;
    accessExpirationMinutes: number;
    refreshExpirationDays: number;
    resetPasswordExpirationMinutes: number;
    resetPINExpirationMinutes: number;
    verifyEmailExpirationMinutes: number;
    inviteExpirationMinutes: number;
  };Token validation failed: expiresAt: Path `expiresAt` is required., user: Path `user` is required.
   */

  /** Generate reset token will generate and save the token then return it. Will be used with PIN and Password reset token*/
  async generateResetToken(user: IUser, type: string) {
    const expires = moment().add(
      type === config.auth.tokenTypes.RESET_PIN
        ? config.jwt.resetPINExpirationMinutes
        : config.jwt.resetPasswordExpirationMinutes,
      "minutes"
    );
    const token = await this.generateToken(user, expires, type);
    return this.saveToken(token, user, expires, type);
  }
}

export const tokenService = TokenService.getInstance();
