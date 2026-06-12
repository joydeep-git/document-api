import { Router } from "express";
import authToken from "../middleware/auth-token.js";
import documentControllers from "../controllers/document-controllers.js";
import multerConfig from "../middleware/multer-config.js";

const documentRouters = Router();

// All document routes are protected
const auth = (req: any, res: any, next: any) => authToken.validator(req, res, next);

// Documents CRUD
documentRouters.get("/", auth, documentControllers.list);
documentRouters.post("/", auth, documentControllers.create);
documentRouters.get("/:id", auth, documentControllers.getOne);
documentRouters.put("/:id", auth, documentControllers.update);
documentRouters.delete("/:id", auth, documentControllers.remove);

// Sharing
documentRouters.post("/:id/share", auth, documentControllers.share);
documentRouters.delete("/:id/share/:shareUserId", auth, documentControllers.unshare);

// File upload / attachments
documentRouters.post(
  "/:id/upload",
  auth,
  multerConfig.documentUpload.single("file"),
  documentControllers.uploadFile,
);
documentRouters.get("/:id/files", auth, documentControllers.getFiles);
documentRouters.get("/files/:attachmentId/download", auth, documentControllers.downloadFile);

export default documentRouters;
