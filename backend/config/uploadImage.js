import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
const uploadPath = path.join(process.cwd(), "/public/img/devices/");

const generateNameFile = () => {
  return new Date()
    .toLocaleString("es-CO", { hour12: true })
    .replaceAll(/[\/\s,.:]|( \. )/g, "")
    .toLowerCase();
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err, uploadPath);
    }
  },
  filename: (req, file, cb) => {
    const name = generateNameFile();
    const extension = ".webp";
    const finalName = `image-${name}${extension}`;
    cb(null, finalName);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});