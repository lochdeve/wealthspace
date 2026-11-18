export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  personalSpaceId: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  timezone: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type UpdateProfileInput = {
  displayName?: string;
  timezone?: string;
};
