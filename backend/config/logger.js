import pino from "pino";
import loadConfig from "./env";

const isProd = loadConfig().NODE_ENV === "production" ? "info" : "debug";

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
