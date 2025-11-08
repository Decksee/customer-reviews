import Position, {
  type IPosition,
  type IPositionMethods,
  type PositionModel,
} from "~/core/entities/position.entity.server";
import { BaseService } from "~/core/abstracts/service.server";
import User from "~/core/entities/user.entity.server";
import mongoose from "mongoose";

export default class PositionService extends BaseService<
  IPosition,
  IPositionMethods,
  PositionModel
> {
  constructor() {
    super(Position);
  }

  private static instance: PositionService;

  public static getInstance(): PositionService {
    if (!PositionService.instance) {
      PositionService.instance = new PositionService();
    }
    return PositionService.instance;
  }

  /**
   * Find position by title
   */
  async findByTitle(title: string): Promise<IPosition | undefined> {
    const position = await this.model.findOne({ title });
    return position || undefined;
  }

  /**
   * Find position by ID
   */
  async findById(id: string): Promise<IPosition | undefined> {
    const position = await this.model.findById(id);
    return position || undefined;
  }

  /**
   * Get all positions
   */
  async getAllPositions(): Promise<IPosition[]> {
    return await this.model.find({}).sort({ title: 1 });
  }

  /**
   * Create a new position
   */
  async createPosition(title: string): Promise<IPosition> {
    return await this.createOne({ title });
  }

  /**
   * Update position title
   */
  async updatePosition(id: string, title: string): Promise<IPosition | null> {
    return await this.model.findByIdAndUpdate(
      id, 
      { $set: { title } },
      { new: true }
    );
  }

  /**
   * Delete position
   */
  async deletePosition(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Check if position is in use by any user
   */
  async isPositionInUse(id: string): Promise<boolean> {
    // Convert string ID to ObjectId for MongoDB query
    const positionObjectId = new mongoose.Types.ObjectId(id);
    const count = await User.countDocuments({ position: positionObjectId });
    return count > 0;
  }
}

export const positionService = PositionService.getInstance(); 