import jwt, { SignOptions } from 'jsonwebtoken';

interface UserTokenPayload {
  id: string;
  phone?: string;
}

interface AdminTokenPayload {
  id: string;
  username: string;
  role: string;
}

export const generateUserToken = (payload: UserTokenPayload, expiresIn: string = '7d'): string => {
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, process.env.SECRET_ACCESS_JWT!, options);
};

export const generateRefreshToken = (userId: string, expiresIn: string = '30d'): string => {
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign({ id: userId }, process.env.SECRET_REFRESH_JWT!, options);
};

export const generateAdminToken = (payload: AdminTokenPayload, expiresIn: string = '24h'): string => {
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, process.env.SECRET_ACCESS_JWT!, options);
};

export const verifyToken = <T>(token: string): T => {
  return jwt.verify(token, process.env.SECRET_ACCESS_JWT!) as T;
};
