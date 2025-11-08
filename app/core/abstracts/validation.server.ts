/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from 'jsonwebtoken';

/**
 * Base validation class
 */
export abstract class BaseValidation {

  /**
   * Validate if a string (value) is a Json Web Token string
   *
   * @param value The value to validate
   * @param helpers Helpers from Joi
   * @returns The validated value or throws an error
   */
  public static jwt = (value: any, helpers: any) => {
    if (!value) {
      return helpers.message({ message: 'No token provided.' });
    }

    try {
      const decoded = jwt.decode(value);
      if (!decoded) {
        return helpers.message({ message: 'Invalid token.' });
      }
    } catch (err) {
      return helpers.message({ message: 'Invalid token.' });
    }

    return value;
  };

  /**
   * Custom validation for mongo object id
   *
   * @param value The value to validate
   * @param helpers Helpers from Joi
   * @returns The validated value or throws an error
   */
  public static rowId = (value: any, helpers: any) => {
    if (!value.match(/^[0-9a-fA-F]{24}$/)) {
      return helpers.message('Invalid object id');
    }
    return value;
  };
}
