import ErrorHandler from "./error-handler.js";
import { StatusCode } from "../types/index.js";
import { errorPrinter } from "./error-responder.js";
import { Prisma } from "../generated/prisma/client.js";



const prismaErrorHandler = (err: unknown): ErrorHandler => {


  errorPrinter("Prisma Error", err);


  if (err instanceof Prisma.PrismaClientKnownRequestError) {

    switch (err.code) {

      case "P2002": {

        let fieldName = "Field";

        try {
          const adapter = err.meta?.driverAdapterError as { cause?: { constraint?: { fields?: string[] } } } | undefined;
          const raw = adapter?.cause?.constraint?.fields?.[0];
          if (raw) fieldName = raw.charAt(0).toUpperCase() + raw.slice(1);
        } catch {
          // fallback to "Field" if structure is unexpected
        }

        // also check standard target as fallback for non-adapter environments
        if (fieldName === "Field" && Array.isArray(err.meta?.target)) {
          const raw = (err.meta.target as string[])[0];
          if (raw) fieldName = raw.charAt(0).toUpperCase() + raw.slice(1);
        }

        return new ErrorHandler({
          message: `${fieldName} is already taken. Please choose another.`,
          status: StatusCode.CONFLICT
        });
      }

      case "P2003":
        return new ErrorHandler({
          message: "Invalid reference. The related record does not exist.",
          status: StatusCode.BAD_REQUEST
        });

      case "P2025":
        return new ErrorHandler({
          message: "The record you are trying to update or delete does not exist.",
          status: StatusCode.NOT_FOUND
        });

      case "P2000":
        return new ErrorHandler({
          message: "Input value is too long for the database field.",
          status: StatusCode.BAD_REQUEST
        });
    }
  }


  if (err instanceof Prisma.PrismaClientValidationError) {
    return new ErrorHandler({
      message: "Invalid data format provided.",
      status: StatusCode.BAD_REQUEST
    });
  }


  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new ErrorHandler({
      message: "Database connection failed. Please try again later.",
      status: StatusCode.SERVICE_UNAVAILABLE
    });
  }


  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return new ErrorHandler({
      message: "Critical database error. Our team has been notified.",
      status: StatusCode.INTERNAL_SERVER_ERROR
    });
  }


  return new ErrorHandler({
    message: "An unexpected database error occurred.",
    status: StatusCode.INTERNAL_SERVER_ERROR
  });
};

export default prismaErrorHandler;