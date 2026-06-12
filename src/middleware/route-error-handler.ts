
import { StatusCode } from "../types/index.js";
import ErrorHandler from "../errors/error-handler.js";


const routeErrorHandler = () => {

  throw new ErrorHandler({ message: "Wrong Route/Method! Please check the api call!", status: StatusCode.BAD_REQUEST });

}

export default routeErrorHandler;