import pino from "pino";
import loadConfig from "./env.js";

const { NODE_ENV } = loadConfig();
const isProd = NODE_ENV === "production" ? "info" : "debug";

const logger = pino({
    level: isProd,
    transport: !isProd
        ? {
              target: "pino-pretty",
              options: { colorize: true },
          }
        : undefined,
});

export default logger;
