import { Router, raw } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  getPatientReferral,
  savePatientReferralDraft,
  submitPatientReferral,
} from "../controllers/referralController.js";
import {
  deleteReferralDocument,
  downloadReferralDocument,
  listReferralDocuments,
  uploadReferralDocument,
} from "../controllers/referralDocumentController.js";

const router = Router();
const referralDocumentBody = raw({
  type: ["application/pdf", "image/jpeg", "image/png"],
  limit: "10mb",
});

function parseReferralDocument(req, res, next) {
  referralDocumentBody(req, res, (error) => {
    if (error?.type === "entity.too.large") {
      return res.status(413).json({ message: "Each document must be 10 MB or smaller." });
    }
    if (error) return res.status(400).json({ message: "Could not read the selected document." });
    next();
  });
}

router.use(verifyToken);

router.get("/patient/:patientId", getPatientReferral);
router.get("/patient/:patientId/documents", listReferralDocuments);
router.get("/patient/:patientId/documents/:documentId", downloadReferralDocument);
router.post(
  "/patient/:patientId/documents",
  requireRole("admitting", "ict_admin"),
  parseReferralDocument,
  uploadReferralDocument
);
router.delete(
  "/patient/:patientId/documents/:documentId",
  requireRole("admitting", "ict_admin"),
  deleteReferralDocument
);
router.put(
  "/patient/:patientId",
  requireRole("admitting", "ict_admin"),
  savePatientReferralDraft
);
router.post(
  "/patient/:patientId/submit",
  requireRole("admitting", "ict_admin"),
  submitPatientReferral
);

export default router;
