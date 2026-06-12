
import { StatusCode } from "../types/index.js";


class ErrorHandler extends Error {

  public statusCode: number;

  constructor({ status, message }: { status?: number; message?: string; }) {

    super(message || "Something went wrong!");

    this.statusCode = status || StatusCode.INTERNAL_SERVER_ERROR;
  }
}

export default ErrorHandler;
