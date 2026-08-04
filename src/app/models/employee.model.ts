export interface EmployeeAuthDto {
  id: number;
  employeeCode: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  position?: string;
  role?: string;
  branchId?: number;
  branchName?: string;
  status?: string;
  hireDate?: string;
  createdAt?: string;
}

export interface EmployeeAuthResponseDto {
  token: string;
  refreshToken: string;
  expiresAt: string;
  employee: EmployeeAuthDto;
}

export interface LoginDto {
  email: string;
  password: string;
}
