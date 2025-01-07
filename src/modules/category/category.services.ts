/* eslint-disable @typescript-eslint/no-explicit-any */
import BaseServices from '../baseServices';
import Category from './category.model';

class CategoryServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

  /**
   * Read all category of user
   */
  async getAll() {
    return this.model.find(); // No filtering by userId
  }
  
}

const categoryServices = new CategoryServices(Category, 'Category');
export default categoryServices;
