
import { Response, Request, NextFunction } from "express";

export const responseWrapper = (_: Request, res: Response, next: NextFunction) => {

  const oldJson = res.json;

  res.json = function (data: any) {

    // already success error
    if (data && (data.success !== undefined || data.error !== undefined)) {
      return oldJson.call(this, data);
    }

    const wrapped = {
      success: true,
      error: false,
      ...data,
    };

    return oldJson.call(this, wrapped);
  };

  next();
};
