import { RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import CustomError from '../errors/customError';
import httpStatus from 'http-status';
import config from '../config';
import { TUserRole } from '../constant/userRole';


export const verifyAuth: RequestHandler = (req, _res, next) => {
  const bearerToken = req.header('Authorization');
  console.log("Request Headers:", req.headers);
  console.log("Authorization Header:", bearerToken);

  if (!bearerToken) {
    console.warn("Authorization header is missing.");
    throw new CustomError(httpStatus.UNAUTHORIZED, 'Unauthorized! Please login', 'Unauthorized');
  }
  
  if (bearerToken) {
    try {
      const token = bearerToken.replace('Bearer ', '');
      console.log("Extracted Token:", token);

      const decode = jwt.verify(token, config.jwt_secret as string) as JwtPayload;
      console.log("Decoded Payload:", decode);

      req.user = {
        _id: decode?._id,
        email: decode?.email,
        role: decode?.role || 'USER',
      };
      console.log("User Info Added to Request:", req.user);

      next();
    } catch (error) {
      console.error("JWT Verification Failed:", error);
      throw new CustomError(httpStatus.UNAUTHORIZED, 'Unauthorized! Please login', 'Unauthorized');
    }
  } else {
    console.warn("Authorization header is missing.");
    throw new CustomError(httpStatus.UNAUTHORIZED, 'Unauthorized! Please login', 'Unauthorized');
  }
};

export const authorizeRoles = (...roles: TUserRole[]): RequestHandler => {
  return (req, _res, next) => {
    const userRole = req.user?.role;
    console.log("Current Roles Allowed:", roles);
    console.log("User Role from Request:", req.user?.role);
   console.log("hhhhhhh",userRole);
    

    if (userRole && roles.includes(userRole)) {
      next();
    } else {
      throw new CustomError(httpStatus.FORBIDDEN, 'Access Denied! Insufficient permissions', 'Forbidden');
    }
  };
};
