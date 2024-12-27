import { Router } from "express";
import {
  getChannelStatus,
  getChannelVideos,
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/status").get(getChannelStatus);
router.route("/videos").get(getChannelVideos);

export default router;
