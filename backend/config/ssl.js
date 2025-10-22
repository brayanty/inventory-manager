import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SSL_CONFIG = {
  keyPath: join(__dirname, "../ssl/key.pem"),
  certPath: join(__dirname, "../ssl/cert.pem"),
};

export default SSL_CONFIG;
