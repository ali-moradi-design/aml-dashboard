import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler, type Router } from "express";
import helmet from "helmet";

type AppDeps = {
  webOrigin: string;
  /** Reverse proxies in front of the API; Express then takes req.ip from X-Forwarded-For. */
  trustProxy?: number;
  routes: Record<string, Router>;
};

/** Builds the Express app from already-wired module routers (easy to test with fakes). */
export const createApp = ({ webOrigin, trustProxy = 0, routes }: AppDeps) => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", trustProxy);
  app.use(helmet());
  // Cookies carry the session, so only the web app's origin may call with credentials.
  app.use(cors({ origin: webOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  Object.entries(routes).forEach(([path, router]) => app.use(path, router));

  app.use((_req, res) => {
    res.status(404).json({ code: "NotFound", message: "Route not found" });
  });

  // Safety net for anything that throws instead of returning a Result.
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ code: "Unexpected", message: "Something went wrong" });
  };
  app.use(onError);

  return app;
};
