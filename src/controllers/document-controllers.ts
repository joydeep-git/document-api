import { NextFunction, Request, Response } from "express";
import { StatusCode } from "../types/index.js";
import { errRes, errRouter } from "../errors/error-responder.js";
import documentQueries from "../prisma-utils/document-queries.js";
import mammoth from "mammoth";



const documentControllers = {


  async list(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const result = await documentQueries.listForUser(userId);

      return res.status(StatusCode.OK).json({ documents: result });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async create(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { title } = req.body;

      const doc = await documentQueries.create(userId, title);

      return res.status(StatusCode.CREATED).json({
        message: "Document created",
        document: doc,
      });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async getOne(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { id } = req.params;

      const doc = await documentQueries.findById({ documentId: id, userId });

      if (!doc) {
        return next(errRes("Document not found or access denied", StatusCode.NOT_FOUND));
      }

      return res.status(StatusCode.OK).json({ document: doc });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async update(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { id } = req.params;
      const { title, content } = req.body;

      if (title === undefined && content === undefined) {
        return next(errRes("Provide title or content to update", StatusCode.BAD_REQUEST));
      }

      // If only updating content (shared user editing)
      if (content !== undefined && title === undefined) {
        const doc = await documentQueries.updateContent({ documentId: id, userId, content });
        if (!doc) return next(errRes("Document not found or access denied", StatusCode.NOT_FOUND));
        return res.status(StatusCode.OK).json({ message: "Document saved", document: doc });
      }

      // Renaming or full update (owner only)
      const doc = await documentQueries.update({ documentId: id, ownerId: userId, title, content });

      return res.status(StatusCode.OK).json({ message: "Document updated", document: doc });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async remove(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { id } = req.params;

      const doc = await documentQueries.delete(id, userId);

      if (!doc) {
        return next(errRes("Document not found or you are not the owner", StatusCode.NOT_FOUND));
      }

      return res.status(StatusCode.OK).json({ message: "Document deleted" });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async share(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { id } = req.params;
      const { email } = req.body;

      if (!email) {
        return next(errRes("email is required to share", StatusCode.BAD_REQUEST));
      }

      const result = await documentQueries.addShare({
        documentId: id,
        ownerId: userId,
        shareWithEmail: email,
      });

      if (!result) {
        return next(errRes("Document not found or you are not the owner", StatusCode.NOT_FOUND));
      }

      if ("error" in result) {
        return next(errRes(result.error as string, StatusCode.BAD_REQUEST));
      }

      return res.status(StatusCode.CREATED).json({
        message: `Document shared with ${result.user.email}`,
        share: result.share,
      });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async unshare(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { id, shareUserId } = req.params;

      const result = await documentQueries.removeShare({
        documentId: id,
        ownerId: userId,
        shareUserId,
      });

      if (!result) {
        return next(errRes("Document not found or you are not the owner", StatusCode.NOT_FOUND));
      }

      return res.status(StatusCode.OK).json({ message: "Share removed" });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { id } = req.params;
      const { importAsContent } = req.body; // "true" to import as doc content

      if (!req.file) {
        return next(errRes("No file uploaded. Supported: .txt, .md, .docx", StatusCode.BAD_REQUEST));
      }

      const { originalname, mimetype, buffer, size } = req.file;
      const ext = originalname.split(".").pop()?.toLowerCase();

      // If importAsContent flag is set, parse and insert into document content
      if (importAsContent === "true" || importAsContent === true) {

        let importedText = "";

        if (ext === "docx") {
          const { value } = await mammoth.extractRawText({ buffer });
          importedText = value;
        } else {
          // txt / md
          importedText = buffer.toString("utf-8");
        }

        // Store as plain-text JSON node compatible with TipTap
        const tiptapContent = JSON.stringify({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: importedText }],
            },
          ],
        });

        const doc = await documentQueries.updateContent({
          documentId: id,
          userId,
          content: tiptapContent,
        });

        if (!doc) {
          return next(errRes("Document not found or access denied", StatusCode.NOT_FOUND));
        }

        return res.status(StatusCode.OK).json({
          message: `${originalname} imported into document`,
          document: doc,
        });
      }

      // Otherwise, attach the file
      const attachment = await documentQueries.addAttachment({
        documentId: id,
        userId,
        filename: originalname,
        mimetype,
        size,
        data: buffer,
      });

      if (!attachment) {
        return next(errRes("Document not found or access denied", StatusCode.NOT_FOUND));
      }

      return res.status(StatusCode.CREATED).json({
        message: "File attached successfully",
        attachment,
      });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async getFiles(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { id } = req.params;

      const doc = await documentQueries.findById({ documentId: id, userId });

      if (!doc) {
        return next(errRes("Document not found or access denied", StatusCode.NOT_FOUND));
      }

      return res.status(StatusCode.OK).json({ attachments: doc.attachments });

    } catch (err) {
      return next(errRouter(err));
    }
  },


  async downloadFile(req: Request, res: Response, next: NextFunction) {
    try {

      const userId = req.user!.id;
      const { attachmentId } = req.params;

      const attachment = await documentQueries.getAttachment(attachmentId, userId);

      if (!attachment) {
        return next(errRes("File not found or access denied", StatusCode.NOT_FOUND));
      }

      res.setHeader("Content-Disposition", `attachment; filename="${attachment.filename}"`);
      res.setHeader("Content-Type", attachment.mimetype);

      return res.send(attachment.data);

    } catch (err) {
      return next(errRouter(err));
    }
  },

};


export default documentControllers;
