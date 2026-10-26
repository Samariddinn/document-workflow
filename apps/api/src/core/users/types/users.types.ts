export interface IUser {
  id: string;
  username: string;
  password_hash: string;
  role: UserRoleEnum;
  org_id: string | null;
  first_name: string;
  middle_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
};

export enum UserRoleEnum {
    SUPER_ADMIN = 'SUPER_ADMIN',
    HEAD = 'HEAD',
    EMPLOYEE = 'EMPLOYEE'
}