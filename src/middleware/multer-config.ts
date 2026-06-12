import multer from "multer";


class MulterConfig {


  // For document file uploads: txt, md, docx
  public documentUpload = multer({

    storage: multer.memoryStorage(),

    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },

    fileFilter(_req, file, cb) {

      const allowed = [
        "text/plain",                // .txt
        "text/markdown",             // .md
        "application/octet-stream",  // .md sometimes sent as this
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      ];

      const ext = file.originalname.split(".").pop()?.toLowerCase();
      const allowedExt = ["txt", "md", "docx"];

      if (!allowed.includes(file.mimetype) && !allowedExt.includes(ext || "")) {
        return cb(new Error("Only .txt, .md, and .docx files are supported"));
      }

      cb(null, true);
    },
  });

}

const multerConfig = new MulterConfig();

export default multerConfig;