import { UserProfile, UpdateUserDTO } from '@agentic-commerce/shared-types';
import { apiClient } from './api';

export const userService = {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/users/profile');
  },

  async updateProfile(data: UpdateUserDTO): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/users/profile', data);
  },
};
