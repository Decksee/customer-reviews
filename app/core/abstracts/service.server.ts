/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, type UpdateWriteOpResult } from "mongoose";
import { type IBaseModel } from "./model.server";
import { type DeleteResult } from "mongodb";
import _ from "lodash";

/**
 * Base Service class for MongoDB/Mongoose operations.
 * Provides common CRUD operations and utility methods for database interactions.
 *
 * @template IModelType - The interface describing your model's properties (must extend IBaseModel)
 * @template IModelMethods - Interface for any custom methods on your model
 * @template MongooseModel - The Mongoose model type
 *
 * @example
 * // First, define your interfaces
 * interface IUser extends IBaseModel {
 *   name: string;
 *   email: string;
 * }
 * 
 * interface IUserMethods {
 *   getFullName(): string;
 * }
 * 
 * // Then create your service
 * class UserService extends BaseService<IUser, IUserMethods, typeof UserModel> {
 *   constructor() {
 *     super(UserModel);
 *   }
 * 
 *   // Add custom methods specific to users
 *   async findByEmail(email: string) {
 *     return this.readOne({ email });
 *   }
 * }
 */
export abstract class BaseService<
  IModelType extends IBaseModel,
  IModelMethods,
  MongooseModel extends Model<IModelType, {}, IModelMethods>
> {
  /** The Mongoose model instance this service operates on */
  protected model: MongooseModel;

  /**
   * Creates a new service instance.
   * @param model - The Mongoose model to use for database operations
   */
  constructor(model: MongooseModel) {
    this.model = model;
  }

  /**
   * Creates a new document in the database.
   * 
   * @param data - The data to create the document with
   * @returns Promise containing the newly created document
   * 
   * @example
   * const userService = new UserService();
   * const newUser = await userService.createOne({
   *   name: "John Doe",
   *   email: "john@example.com"
   * });
   */
  async createOne(data: Partial<IModelType>) {
    const newModel = new this.model(data);
    return await newModel.save();
  }

  /**
   * Creates multiple documents in the database simultaneously.
   * 
   * @param data - Array of documents to create
   * @returns Promise containing array of created documents
   * 
   * @example
   * const users = await userService.createMany([
   *   { name: "John", email: "john@example.com" },
   *   { name: "Jane", email: "jane@example.com" }
   * ]);
   */
  async createMany(data: Partial<IModelType>[]) {
    return await this.model.insertMany(data);
  }

  /**
   * Retrieves multiple documents based on a filter.
   * 
   * @param filter - Query filter to apply
   * @param options - Additional options for the query
   * @param options.sort - Sorting criteria (e.g., { createdAt: -1 })
   * @param options.populate - Related fields to populate (comma-separated string)
   * @returns Promise containing array of matching documents
   * 
   * @example
   * // Get all active users, sorted by creation date
   * const users = await userService.readMany(
   *   { isActive: true },
   *   { sort: { createdAt: -1 }, populate: 'posts,comments' }
   * );
   */
  async readMany(
    filter: Partial<IModelType>,
    options: { sort?: any; populate?: string } = {}
  ) {
    if (options.populate && options.sort) {
      return await this.model
        .find(filter)
        .sort(options.sort)
        .populate(options.populate.split(",").join(" "));
    }

    if (options.populate) {
      return await this.model
        .find(filter)
        .populate(options.populate.split(",").join(" "));
    }

    if (options.sort) {
      return await this.model.find(filter).sort(options.sort);
    }

    return await this.model.find(filter);
  }

  /**
   * Read many paginated documents from the database based on the filter and options
   *
   * @param filter Filter to apply on the query
   * @param options Options to apply on the query can be: populate (commas separated) limit, page, sortBy for pagination purpose
   * @returns
   */
  async readManyPaginated(filter: any, options: any) {
    // options.populate = 'author';
    const d =  await (this.model as any).paginate(filter, options);
    return d;
  }

  /**
   * Read one document from the database based on the filter
   *
   * @param filter Filter to apply on the query
   * @returns Promise<IModelType | null>
   */
  async readOne(filter: any) {
    // If filter is a single value (id) and not an object, quick return the document by id
    if (typeof filter === "string") {
      return await this.model.findById(filter);
    }

    if (filter.id) {
      filter._id = filter.id;
      delete filter.id;
    }

    // Handle case where filter.populate is passed as commas separated string
    if (filter.populate) {
      const populateFields = filter.populate.split(",").join(" ");
      delete filter.populate;
      return await this.model.findOne(filter).populate(populateFields);
    }

    return await this.model.findOne(filter);
  }

  /**
   * Update one document from the database based on the filter
   *
   * @param filter The filter to apply on the query
   * @param data The data to update the document with
   * @returns Promise<IModelType | null>
   */
  async updateOne(id: string, data: any) {
    // if (filter.id) {
    //   filter._id = filter.id;
    //   delete filter.id;
    // }
    // return await this.model.findOneAndUpdate(filter, data, { new: true });

    const existingItem = await this.model.findById(id);

    // Deep merge the existing property with the new update
    _.merge(existingItem, data);

    // Save the updated property
    return await existingItem?.save();
  }

  /**
   * Update one document from the database based on the filter.
   *
   * Where the above will merge the existing document with the new data,
   * this method will replace the existing document with the new data.
   * @param id
   * @param data
   * @returns
   */
  async updateOneAfterFindIt(id: any, data: any) {
    const existingItem = await this.model.findById(id);
    if (!existingItem) {
      throw new Error("Item not found");
    }
    Object.assign(existingItem, data);
    return await existingItem.save();
  }

  /**
   * Update many documents from the database based on the filter
   *
   * @param filter The filter to apply on the query
   * @param data The data to update the documents with.
   * This is an object not an array of objects
   * @returns Promise<UpdateWriteOpResult>
   */
  async updateMany(filter: any, data: any): Promise<UpdateWriteOpResult> {
    if (filter.id) {
      filter._id = filter.id;
      delete filter.id;
    }
    return await this.model.updateMany(filter, data);
  }

  /**
   * Delete one document from the database based on the filter
   *
   * @param filter The filter to apply on the query
   * @returns Promise<IModelType | null>
   */
  async deleteOne(filter: any) {
    // If filter is a single value (id) and not an object, quick return the document by id
    if (typeof filter === "string") {
      return await this.model.findByIdAndDelete(filter);
    }

    if (filter.id) {
      filter._id = filter.id;
      delete filter.id;
    }
    return await this.model.findOneAndDelete(filter);
  }

  /**
   * Delete many documents from the database based on the filter
   *
   * @param filter The filter to apply on the query
   * @returns Promise<DeleteResult>
   */
  async deleteMany(filter: any): Promise<DeleteResult> {
    if (filter.id) {
      filter._id = filter.id;
      delete filter.id;
    }
    return await this.model.deleteMany(filter);
  }

  /**
   * Utility Methods for Test Data Generation
   * These methods are helpful when creating test data or seeding the database
   */

  /**
   * Selects a random element from an array.
   * Useful for creating test data with random values.
   * 
   * @param array - Array to select from
   * @returns Randomly selected element
   * 
   * @example
   * const colors = ['red', 'blue', 'green'];
   * const randomColor = this.getRandomElement(colors);
   */
  protected getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Selects a specified number of random elements from an array.
   * Ensures no duplicates in the selected elements.
   *
   * @param array - The array to select from.
   * @param count - The number of elements to select.
   * @returns An array of randomly selected elements.
   */
  protected getRandomElements<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      count = array.length;
    }
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  /**
   * Generates a random integer between min and max (inclusive).
   *
   * @param min - The minimum value.
   * @param max - The maximum value.
   * @returns A random integer between min and max.
   */
  protected getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generates a random float between min and max with two decimal places.
   *
   * @param min - The minimum value.
   * @param max - The maximum value.
   * @returns A random float between min and max.
   */
  protected getRandomFloat(min: number, max: number): number {
    const float = Math.random() * (max - min) + min;
    return Math.round(float * 100) / 100;
  }

  /**
   * Generates a random date between two dates.
   *
   * @param start - The start date.
   * @param end - The end date.
   * @returns A randomly generated Date object between start and end.
   */
  protected getRandomDate(start: Date, end: Date): Date {
    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();
    const randomTimestamp = this.getRandomInt(startTimestamp, endTimestamp);
    return new Date(randomTimestamp);
  }

  /**
   * Checks if a document with the given criteria exists.
   *
   * @param criteria - The search criteria.
   * @returns A boolean indicating if the document exists.
   */
  protected async exists(criteria: Partial<any>): Promise<boolean> {
    const count = await this.model.countDocuments(criteria).exec();
    return count > 0;
  }

  /**
   * Retrieves the last N documents from the collection based on the creation date and filter.
   *
   * @param {number} n - The number of recent documents to retrieve.
   * @param {any} filter - The filter to apply on the query.
   * @returns {Promise<Array<string>>} - An array of document IDs.
   */
  async getLastNRecordIDs(n: number, filter: any): Promise<string[]> {
    const records = await this.model
      .find(filter) // Apply the filter to the query
      .sort({ createdAt: -1 }) // Sort by creation date descending
      .limit(n) // Limit the number of documents to retrieve
      .select("_id") // Select only the _id field
      .exec();

    // Extract and return the _id values
    return records.map((record) => record._id);
  }

  /**
   * Retrieves the most recent documents matching a filter.
   * 
   * @param n - Number of documents to retrieve
   * @param filter - Query filter to apply
   * @param populateFields - Array of field names to populate
   * @returns Promise containing array of recent documents
   * 
   * @example
   * // Get the 5 most recent active users with their posts
   * const recentUsers = await userService.getLastNRecords(
   *   5,
   *   { isActive: true },
   *   ['posts']
   * );
   */
  async getLastNRecords(
    n: number,
    filter: Partial<IModelType>,
    populateFields: string[] = []
  ): Promise<IModelType[]> {
    try {
      let query = this.model.find(filter).sort({ createdAt: -1 }).limit(n);

      populateFields.forEach((field) => {
        query = query.populate(field);
      });

      return await query.exec();
    } catch (error) {
      console.error("Error retrieving the last N records:", error);
      throw error;
    }
  }
}
