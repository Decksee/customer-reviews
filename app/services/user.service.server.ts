import User, {
  type IUser,
  type IUserMethods,
  type UserModel,
} from "~/core/entities/user.entity.server";
import { BaseService } from "~/core/abstracts/service.server";
import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { positionService } from "~/services/position.service.server";


export default class UserService extends BaseService<
  IUser,
  IUserMethods,
  UserModel
> {
  constructor() {
    super(User);
  }

  private static instance: UserService;

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
 

  /**
   * Find user by email and password
   */
  async findByEmailAndPassword(
    email: string,
    password: string
  ): Promise<IUser | undefined> {
    const user = await this.model.findOne({ email }).populate('position');
    if (user && (await user.isPasswordMatch(password))) {
      return user;
    }
    return undefined;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<IUser | undefined> {
    const user = await this.model.findOne({ email }).populate('position');
    return user || undefined;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<IUser | undefined> {
    const user = await this.model.findById(id).populate('position');
    return user || undefined;
  }

  /**
   * Get all employees (non-admin users)
   */
  async getAllEmployees(limit?: number): Promise<IUser[]> {
    const query = this.model.find({ role: { $ne: 'admin' } }).populate('position');
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query.exec();
  }

  /**
   * Count employees (non-admin users)
   */
  async countEmployees(): Promise<number> {
    return await this.model.countDocuments({ role: { $ne: 'admin' } });
  }

  /**
   * Find employees by position (role in report context)
   */
  async findEmployeesByRole(positionTitle: string): Promise<IUser[]> {
    // First try to find by position reference
    const position = await positionService.readOne({ title: positionTitle });
    
    if (position) {
      return await this.model.find({ 
        role: { $ne: 'admin' },
        position: position._id 
      }).populate('position');
    }
    
    // Fallback to deprecated currentPosition field
    return await this.model.find({ 
      role: { $ne: 'admin' },
      currentPosition: positionTitle 
    }).populate('position');
  }

  /**
   * Get employee with all employee details
   * Gets an employee with all additional fields like position, phone, address, etc.
   */
  async getEmployeeDetails(id: string): Promise<any> {
    const employee = await this.model.findById(id).populate('position');
    
    if (!employee) {
      return null;
    }
    
    // In a real app, you might need to transform the document to include additional fields
    // that come from a different collection or are calculated
    return {
      ...employee.toObject(),
      position: employee.get('currentPosition') || 'Employé',
      phone: employee.get('phone') || '',
      address: employee.get('address') || '',
      hireDate: employee.get('hireDate') || new Date().toISOString(),
      photo: employee.get('photo') || '/images/employees/employee1.jpg'
    };
  }

  /**
   * Update employee details
   * @param id - The employee ID
   * @param data - The data to update
   */
  async updateEmployeeDetails(id: string, data: any): Promise<any> {
    return await this.model.findByIdAndUpdate(
      id, 
      { $set: data },
      { new: true }
    ).populate('position');
  }

  /**
   * Get top rated employees with their statistics
   * @param limit - Number of top employees to return
   * @returns Promise<any[]> - Array of top employees with their ratings
   */
  async getTopRatedEmployees(limit: number = 5): Promise<any[]> {
    try {
      // Get all employees
      const employees = await this.getAllEmployees();
      
      // Get employee statistics from feedback session service
      const employeeStats = await feedbackSessionService.getEmployeeStatistics();
      
      // Create enriched employee data
      const enrichedEmployees = [];
      
      for (const employee of employees) {
        if (!employee._id) continue;
        
        const employeeId = employee._id.toString();
        const stats = employeeStats.find((stat: any) => stat.employeeId === employeeId);
        
        if (stats && stats.totalReviews > 0) {
          enrichedEmployees.push({
            id: employeeId,
            name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            role: (employee.position as any)?.title || employee.currentPosition || 'Employé',
            rating: stats.averageRating || 0,
            reviewCount: stats.totalReviews || 0,
            score: stats.score || 0,
            avatar: employee.photo || `/images/employees/employee1.jpg`
          });
        }
      }
      
      // Sort by rating (highest first) and limit the result
      enrichedEmployees.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      //Sort by score (highest first) and limit the result
      enrichedEmployees.sort((a, b) => b.score - a.score);
      
      return enrichedEmployees.slice(0, limit);
    } catch (error) {
      console.error('Error getting top rated employees:', error);
      return [];
    }
  }

  /**
   * Get recent employee reviews
   * @param limit - Number of recent reviews to return
   * @returns Promise<any[]> - Array of recent employee reviews
   */
  async getRecentEmployeeReviews(limit: number = 4): Promise<any[]> {
    try {
      // Get recent reviews from all employees
      const { ratings } = await feedbackSessionService.getEmployeeRatings(undefined, 1, 50);
      
      // Enrich with employee data
      const enrichedReviews = [];
      
      for (const rating of ratings) {
        try {
          // Get employee
          const employee = await this.findById(rating.employeeId);
          
          if (employee) {
            enrichedReviews.push({
              id: rating.id,
              employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
              employeeRole: employee.currentPosition || 'Employé',
              rating: rating.rating,
              comment: rating.comment || '',
              date: rating.date,
              avatar: employee.photo || `/images/employees/employee1.jpg`
            });
          }
        } catch (error) {
          console.error(`Error processing review for employee ${rating.employeeId}:`, error);
        }
      }
      
      // Sort by date (most recent first) and limit the result
      enrichedReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return enrichedReviews.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent employee reviews:', error);
      return [];
    }
  }

  /**
   * Get employee review distribution statistics
   * @returns Promise<any> - Employee review distribution statistics
   */
  async getEmployeeReviewDistribution(): Promise<any> {
    try {
      // Get all employees count
      const totalEmployees = await this.countEmployees();
      
      // Get employee statistics
      const employeeStats = await feedbackSessionService.getEmployeeStatistics();
      
      // Count employees with reviews
      const withReviews = employeeStats.length;
      
      // Calculate average rating and total reviews
      let totalRating = 0;
      let totalReviews = 0;
      
      employeeStats.forEach((stat: any) => {
        totalRating += stat.averageRating * stat.totalReviews;
        totalReviews += stat.totalReviews;
      });
      
      const averageRating = totalReviews > 0 ? 
        parseFloat((totalRating / totalReviews).toFixed(1)) : 0;
      
      return {
        withReviews,
        totalEmployees,
        averageRating,
        totalReviews
      };
    } catch (error) {
      console.error('Error getting employee review distribution:', error);
      return {
        withReviews: 0,
        totalEmployees: 0,
        averageRating: 0,
        totalReviews: 0
      };
    }
  }

  /**
   * Find employees by position ID
   */
  async findEmployeesByPositionId(positionId: string): Promise<IUser[]> {
    return await this.model.find({ 
      role: { $ne: 'admin' },
      position: positionId 
    }).populate('position');
  }

  /**
   * Update user's position
   */
  async updateUserPosition(userId: string, positionId: string | null): Promise<IUser | null> {
    return await this.model.findByIdAndUpdate(
      userId, 
      { $set: { position: positionId } },
      { new: true }
    ).populate('position');
  }
}

export const userService = UserService.getInstance();
