import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import * as dohController from "../controllers/dohReportController.js";

const router = express.Router();

// Require authentication and HIM/ICT roles
router.use(verifyToken);
router.use(requireRole("him_staff", "ict_admin"));

router.get("/doh-form-4-1", dohController.getForm41);
router.get("/doh-form-4-2", dohController.getForm42);
router.get("/doh-form-4-3-demographics", dohController.getForm43Part1);
router.get("/doh-form-4-3-employment", dohController.getForm43Part2);
router.get("/doh-form-4-3-education", dohController.getForm43Part3);
router.get("/doh-form-4-3-substance", dohController.getForm43Part4);
router.get("/doh-form-4-3-readmissions", dohController.getForm43Part5);
router.get("/doh-form-4-3-comorbidities", dohController.getForm43Part6);
router.get("/doh-form-10-1", dohController.getForm101);
router.get("/doh-form-10-2", dohController.getForm102);
router.get("/doh-form-11", dohController.getForm11);
router.get("/program-census", dohController.getProgramCensus);
router.get("/non-completers", dohController.getNonCompleters);
router.get("/positive-dt", dohController.getPositiveDTRoster);

export default router;
