import { NextFunction, Request, Response } from "express";

/* This function should be used as a middleware in testing to bypass the need to mock a passport strategy */
export const mockAuth = (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.header("x-testuserid");
  if (userId) {
    req.user = {
      id: userId,
      username: "test",
      profilePictureUrl: "test",
    };
  }
  next();
};
