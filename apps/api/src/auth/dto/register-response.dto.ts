import { UserProfileDto } from './user-profile.dto';

/** Same shape as login and GET /auth/me. */
export class RegisterResponseDto extends UserProfileDto {}
