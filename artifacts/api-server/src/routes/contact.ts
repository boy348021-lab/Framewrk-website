import { Router, type IRouter } from "express";
// The same CommonJS handler is used by the production serverless endpoint.
// @ts-expect-error The serverless JavaScript module has no TypeScript declaration.
import contactHandler from "../../../../api/contact.js";

const router: IRouter = Router();

router.all("/contact", contactHandler);

export default router;