
import { StatusCode } from "../types/index.js";
import { Prisma } from "../generated/prisma/client.js";
import ErrorHandler from "./error-handler.js";
import prismaErrorHandler from "./prisma-error-handler.js";



export const errRes = (message: string, status: number): ErrorHandler => {
  return new ErrorHandler({ message, status });
};



export const errRouter = (err: unknown, fallbackMessage = "Internal Server Error"): ErrorHandler => {

  if (err instanceof ErrorHandler) return err;

  if (isPrismaError(err)) return prismaErrorHandler(err);

  if (err instanceof Error) {

    if (process.env.NODE_ENV === 'development') {
      return new ErrorHandler({
        message: err.message,
        status: StatusCode.INTERNAL_SERVER_ERROR
      });
    }

    errorPrinter("General Errors", err);

    return new ErrorHandler({
      message: fallbackMessage,
      status: StatusCode.INTERNAL_SERVER_ERROR
    });
  }


  return new ErrorHandler({
    message: fallbackMessage,
    status: StatusCode.INTERNAL_SERVER_ERROR
  });
};




const isPrismaError = (err: unknown): boolean => {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  );
};



export const errorPrinter = (type: string, err: unknown) => {

  const isDev: boolean = (process.env.NODE_ENV === "development") || false;

  if (isDev) {
    console.log(`[${type}]`, JSON.stringify(err));
  } else {
    console.log(type);
  }

}
