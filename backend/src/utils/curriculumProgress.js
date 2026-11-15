import pool from "../config/db.js";
import { ensureAttendanceCompletionSchema } from "./attendanceSchema.js";

export const CORE_TARGETS = {
  CBT: 28,
  CBT_E: 3,
  PE: 12,
  TOTAL_CORE: 43,
};

export const CORE_CBT_TOPICS = [
  { id: 2, code: "CBT-01", sessionNumber: 1, title: "Sesyon 1. Pag-iskedyul", altTitle: "1. Ang Aking Kwento (Pagsusuri sa Sarili)" },
  { id: 3, code: "CBT-02", sessionNumber: 2, title: "Sesyon 2. Mga Tukso", altTitle: "2. Pagkilala sa Trigger" },
  { id: 4, code: "CBT-03", sessionNumber: 3, title: "Sesyon 3. Pagkaya sa Mga Tukso", altTitle: "3. Pamamahala sa Pananabik (Craving) sa Droga" },
  { id: 5, code: "CBT-04", sessionNumber: 4, title: "Sesyon 4. Pagkontrol sa Kaisipan", altTitle: "4. Pagkatuto ng mga Kasanayan sa Pagtanggi sa Droga" },
  { id: 6, code: "CBT-05", sessionNumber: 5, title: "Sesyon 5. External Triggers", altTitle: "5. Pag-iwas sa mga Mapanganib na Sitwasyon" },
  { id: 7, code: "CBT-06", sessionNumber: 6, title: "Sesyon 6. Internal Triggers", altTitle: "6. Pagkilala sa mga Di-makatwirang Kaisipan" },
  { id: 8, code: "CBT-07", sessionNumber: 7, title: "Sesyon 7. Daan Tungo sa Paggaling", altTitle: "7. Paghamon at Pagbabago ng mga Di-makatwirang Kaisipan" },
  { id: 9, code: "CBT-08", sessionNumber: 8, title: "Sesyon 8. Mga Meeting ng Self-Help Group", altTitle: "8. Pagharap sa Negatibong Emosyon" },
  { id: 10, code: "CBT-09", sessionNumber: 9, title: "Sesyon 9. Ang Karunungang 12-Steps", altTitle: "9. Pamamahala ng Galit" },
  { id: 11, code: "CBT-10", sessionNumber: 10, title: "Sesyon 10. Mga Karaniwang Hamon sa Pagpapanatili ng Abstinence", altTitle: "10. Pamamahala ng Stress" },
  { id: 12, code: "CBT-11", sessionNumber: 11, title: "Sesyon 11. Pag-iisip, Pakikiramdam, at Pagsasagawa", altTitle: "11. Kasanayan sa Paglutas ng Problema" },
  { id: 13, code: "CBT-12", sessionNumber: 12, title: "Sesyon 12. Alak", altTitle: "12. Epektibong Komunikasyon" },
  { id: 14, code: "CBT-13", sessionNumber: 13, title: "Sesyon 13. Pagkabagot", altTitle: "13. Pagpapatibay ng Ugnayan sa Pamilya" },
  { id: 15, code: "CBT-14", sessionNumber: 14, title: "Sesyon 14. Pag-iwas sa Relapse Drift", altTitle: "14. Pagbuo ng Suportang Panlipunan" },
  { id: 16, code: "CBT-15", sessionNumber: 15, title: "Sesyon 15. Lapse and Relapse", altTitle: "15. Pagpapahalaga sa Sarili at Kumpiyansa" },
  { id: 17, code: "CBT-16", sessionNumber: 16, title: "Sesyon 16. Trabaho at Paggaling", altTitle: "16. Pagtatakda ng Layunin sa Buhay" },
  { id: 18, code: "CBT-17", sessionNumber: 17, title: "Sesyon 17. Konsensya at Kahihiyan", altTitle: "17. Pamamahala ng Oras at Pang-araw-araw na Gawain" },
  { id: 19, code: "CBT-18", sessionNumber: 18, title: "Sesyon 18. Pananatiling Abala", altTitle: "18. Malusog na Pamumuhay at Pangangalaga sa Katawan" },
  { id: 20, code: "CBT-19", sessionNumber: 19, title: "Sesyon 19. Motibasyon para sa Paggaling", altTitle: "19. Pag-unawa sa Relapse bilang Proseso" },
  { id: 21, code: "CBT-20", sessionNumber: 20, title: "Sesyon 20. Pagkamatapat", altTitle: "20. Pagkilala sa mga Babala ng Relapse" },
  { id: 22, code: "CBT-21", sessionNumber: 21, title: "Sesyon 21. Mga Argumento sa Alak", altTitle: "21. Pagbuo ng Relapse Prevention Plan" },
  { id: 23, code: "CBT-22", sessionNumber: 22, title: "Sesyon 22. Sex at Paggaling", altTitle: "22. Pagharap sa Slip o Pansamantalang Pagkadulas" },
  { id: 24, code: "CBT-23", sessionNumber: 23, title: "Sesyon 23. Pag-agap at Pag-iwas sa muling Paggamit", altTitle: "23. Pagpapatawad sa Sarili at sa Iba" },
  { id: 25, code: "CBT-24", sessionNumber: 24, title: "Sesyon 24. Tiwala", altTitle: "24. Espiritwalidad at Kahulugan sa Buhay" },
  { id: 26, code: "CBT-25", sessionNumber: 25, title: "Sesyon 25. Maging Matalino, Hindi Malakas", altTitle: "25. Paghahanda sa Trabaho o Kabuhayan" },
  { id: 27, code: "CBT-26", sessionNumber: 26, title: "Sesyon 26. Ang Kahulugan ng Ispiritwalidad", altTitle: "26. Responsibilidad sa Komunidad" },
  { id: 28, code: "CBT-27", sessionNumber: 27, title: "Sesyon 27. Pamamahala ng Buhay at Pera", altTitle: "27. Pagpapanatili ng Pagbabago" },
  { id: 29, code: "CBT-28", sessionNumber: 28, title: "Sesyon 28. Pangangatwiran sa Muling Paggamit (1)", altTitle: "28. Pagdiriwang ng Tagumpay at Pagtatapos" },
];

export const CORE_CBTE_TOPICS = [
  {
    id: 48,
    code: "CBTE-01",
    evalType: "CBTE_1",
    sessionNumber: 1,
    title: "Sesyon 1. Pagsusuri ng Katayuan ng Paggaling (CBT-E 1 · Week 5)",
    shortTitle: "CBT-E 1: Pagsusuri ng Katayuan ng Paggaling",
  },
  {
    id: 49,
    code: "CBTE-02",
    evalType: "CBTE_2",
    sessionNumber: 2,
    title: "Sesyon 2. Pagsusuri sa mga Pag-uugali para sa Pag-iwas sa Muling Paggamit (CBT-E 2 · Week 13)",
    shortTitle: "CBT-E 2: Pag-iwas sa Muling Paggamit (Relapse Prevention)",
  },
  {
    id: 50,
    code: "CBTE-03",
    evalType: "CBTE_3",
    sessionNumber: 3,
    title: "Sesyon 3. Pagpapatuloy ng Treatment Planning (CBT-E 3 · Month 6–7)",
    shortTitle: "CBT-E 3: Pagpapatuloy ng Treatment Planning",
  },
];

export const CORE_PE_TOPICS = [
  { id: 51, code: "PE-PAT-01", sessionNumber: 1, title: "Sesyon 1: Triggers/Mga Tukso at Cravings/Giyang (1)", altTitle: "1. Katotohanan Tungkol sa Droga at Epekto Nito" },
  { id: 52, code: "PE-PAT-02", sessionNumber: 2, title: "Sesyon 2: Triggers/Mga Tukso at Cravings/Giyang (2)", altTitle: "2. Ang Adiksyon Bilang Sakit sa Utak" },
  { id: 53, code: "PE-PAT-03", sessionNumber: 3, title: "Sesyon 3: Alak at Recovery (1)", altTitle: "3. Epekto ng Droga sa Pisikal at Mental na Kalusugan" },
  { id: 54, code: "PE-PAT-04", sessionNumber: 4, title: "Sesyon 4: Alak at Recovery (2)", altTitle: "4. Epekto ng Adiksyon sa Pamilya at Relasyon" },
  { id: 55, code: "PE-PAT-05", sessionNumber: 5, title: "Sesyon 5: Shabu at Cocaine (1)", altTitle: "5. Ang Proseso ng Pagrekober at Gamutan" },
  { id: 56, code: "PE-PAT-06", sessionNumber: 6, title: "Sesyon 6: Shabu at Cocaine (2)", altTitle: "6. Batas sa Droga (RA 9165) at Plea Bargaining" },
  { id: 57, code: "PE-PAT-07", sessionNumber: 7, title: "Sesyon 7: Daan Tungo sa Recovery (1)", altTitle: "7. Pag-iwas sa HIV/AIDS at Iba Pang Nakakahawang Sakit" },
  { id: 58, code: "PE-PAT-08", sessionNumber: 8, title: "Sesyon 8: Daan Tungo sa Recovery (2)", altTitle: "8. Pamamahala ng Craving at Triggers" },
  { id: 59, code: "PE-PAT-09", sessionNumber: 9, title: "Sesyon 9: Ang Pamilya at Recovery (1)", altTitle: "9. Kasanayan sa Buhay (Life Skills) at Komunikasyon" },
  { id: 60, code: "PE-PAT-10", sessionNumber: 10, title: "Sesyon 10: Ang Pamilya at Recovery (2)", altTitle: "10. Pagbuo ng Malusog na Kaugalian at Disiplina" },
  { id: 61, code: "PE-PAT-11", sessionNumber: 11, title: "Sesyon 11: Marijuana", altTitle: "11. Paghahanda sa Muling Pakikiisa sa Komunidad" },
  { id: 62, code: "PE-PAT-12", sessionNumber: 12, title: "Sesyon 12: Opioids at Club Drugs", altTitle: "12. Pangmatagalang Aftercare at Suportang Grupo" },
];

function normalizeStr(val) {
  return String(val || "").trim().toLowerCase();
}

export function classifyCurriculumRow(row) {
  const topicId = row.topic_id ? Number(row.topic_id) : null;
  const category = String(row.topic_category || row.category || "").toUpperCase();
  const topicCode = String(row.topic_code || "").toUpperCase();
  const sessionType = String(row.session_type || "").toUpperCase();
  const reqText = normalizeStr(
    row.curriculum_requirement || row.topic_name || row.session_name || ""
  );

  // 1. Orientation
  if (
    topicId === 1 ||
    category === "ORIENTATION" ||
    topicCode === "ORIENTATION-01" ||
    reqText.includes("orientation-01") ||
    reqText.includes("oryentasyon sa programa")
  ) {
    return { group: "ORIENTATION", slot: 1 };
  }

  // 2. CBT-E (3 core evaluation sessions)
  if (
    topicId === 48 ||
    topicCode === "CBTE-01" ||
    reqText.includes("cbte-01") ||
    reqText.includes("cbt-e 1") ||
    reqText.includes("cbte 1") ||
    reqText.includes("pagsusuri ng katayuan ng paggaling")
  ) {
    return { group: "CBT_E", slot: 1, matchedTopic: CORE_CBTE_TOPICS[0] };
  }
  if (
    topicId === 49 ||
    topicCode === "CBTE-02" ||
    reqText.includes("cbte-02") ||
    reqText.includes("cbt-e 2") ||
    reqText.includes("cbte 2") ||
    reqText.includes("pagsusuri sa mga pag-uugali")
  ) {
    return { group: "CBT_E", slot: 2, matchedTopic: CORE_CBTE_TOPICS[1] };
  }
  if (
    topicId === 50 ||
    topicCode === "CBTE-03" ||
    reqText.includes("cbte-03") ||
    reqText.includes("cbt-e 3") ||
    reqText.includes("cbte 3") ||
    reqText.includes("pagpapatuloy ng treatment planning")
  ) {
    return { group: "CBT_E", slot: 3, matchedTopic: CORE_CBTE_TOPICS[2] };
  }
  if (
    category === "CBT_E" ||
    sessionType === "CBT_E" ||
    reqText.includes("cbt-e") ||
    reqText.includes("cbte")
  ) {
    return { group: "CBT_E", slot: null, matchedTopic: null };
  }

  // 3. Conjoint / Family (including PE_FAMILY)
  if (
    sessionType === "CONJOINT_FAMILY" ||
    category === "PE_FAMILY" ||
    topicCode.startsWith("PE-FAM") ||
    reqText.includes("pe-fam")
  ) {
    return { group: "CONJOINT_FAMILY", slot: null };
  }

  // 4. Psycho-Education (12 patient PE requirements)
  if (
    sessionType === "PSYCHO_EDUCATION" ||
    category === "PE_PATIENT" ||
    topicCode.startsWith("PE-PAT") ||
    reqText.includes("pe-pat")
  ) {
    if (topicId && topicId >= 51 && topicId <= 62) {
      const idx = topicId - 51;
      return { group: "PE", slot: idx + 1, matchedTopic: CORE_PE_TOPICS[idx] };
    }
    for (const peTopic of CORE_PE_TOPICS) {
      const codeNorm = normalizeStr(peTopic.code);
      const titleNorm = normalizeStr(peTopic.title);
      const titleBody = normalizeStr(peTopic.title.replace(/^sesyon\s*\d+[:.]\s*/i, ""));
      const altBody = normalizeStr((peTopic.altTitle || "").replace(/^\d+\.\s*/, ""));
      if (
        reqText.includes(codeNorm) ||
        reqText === titleNorm ||
        (titleBody && reqText.includes(titleBody)) ||
        (altBody && reqText.includes(altBody))
      ) {
        return { group: "PE", slot: peTopic.sessionNumber, matchedTopic: peTopic };
      }
    }
    return { group: "PE", slot: null, matchedTopic: null };
  }

  // 5. CBT Group (28 core CBT requirements + elective CBT 29..46)
  if (
    sessionType === "CBT_GROUP" ||
    category === "CBT" ||
    topicCode.startsWith("CBT-") ||
    reqText.includes("[cbt-")
  ) {
    if (topicId && topicId >= 2 && topicId <= 29) {
      const idx = topicId - 2;
      return { group: "CBT", slot: idx + 1, isElective: false, matchedTopic: CORE_CBT_TOPICS[idx] };
    }
    if (topicId && topicId >= 30 && topicId <= 47) {
      return { group: "CBT", slot: null, isElective: true, matchedTopic: null };
    }
    for (const cbtTopic of CORE_CBT_TOPICS) {
      const codeNorm = normalizeStr(cbtTopic.code);
      const titleNorm = normalizeStr(cbtTopic.title);
      const titleBody = normalizeStr(cbtTopic.title.replace(/^sesyon\s*\d+[:.]\s*/i, ""));
      const altBody = normalizeStr((cbtTopic.altTitle || "").replace(/^\d+\.\s*/, ""));
      if (
        reqText.includes(codeNorm) ||
        reqText === titleNorm ||
        (titleBody && reqText.includes(titleBody)) ||
        (altBody && reqText.includes(altBody))
      ) {
        return { group: "CBT", slot: cbtTopic.sessionNumber, isElective: false, matchedTopic: cbtTopic };
      }
    }
    return { group: "CBT", slot: null, isElective: false, matchedTopic: null };
  }

  // 6. Supplementary Services
  if (sessionType === "SHGM") {
    return { group: "SHGM", slot: null };
  }
  if (sessionType === "INDIVIDUAL_COUNSELING") {
    return { group: "INDIVIDUAL_COUNSELING", slot: null };
  }

  return { group: "OTHER", slot: null };
}

/**
 * Pure calculation of a single patient's lifetime curriculum completion
 * from their attendance rows and optional formal CBT-E evaluation rows.
 */
export function calculatePatientCurriculumProgress(attendanceRows = [], cbteEvaluationRows = []) {
  const cbtCompletedSlots = new Set();
  let cbtUnslottedCredited = 0;
  let cbtRawPhysical = 0;

  const cbteCompletedSlots = new Set();
  let cbteUnslottedCredited = 0;
  let cbteRawPhysical = 0;

  const peCompletedSlots = new Set();
  let peUnslottedCredited = 0;
  let peRepeatCredited = 0;
  let peRawPhysical = 0;

  let cbtRepeatCredited = 0;
  let cbteRepeatCredited = 0;

  let shgmCredited = 0;
  let shgmPhysical = 0;
  let indCounselingCredited = 0;
  let indCounselingPhysical = 0;
  let conjointFamilyCredited = 0;
  let conjointFamilyPhysical = 0;
  let orientationCredited = 0;

  let totalCreditedAll = 0;
  let totalPhysicalAttended = 0;
  let pendingReviewCount = 0;
  let repeatCount = 0;
  let makeupCreditedCount = 0;
  let lateCount = 0;
  let excusedCount = 0;
  let absentCount = 0;
  let cancelledCount = 0;
  let outstandingMakeupsCount = 0;

  // Build set of attendance IDs fulfilled by a credited makeup row
  const fulfilledIds = new Set();
  for (const r of attendanceRows) {
    const st = String(r.status || "").toLowerCase();
    const cs = r.completion_status || (st === "present" ? "CREDITED" : "NOT_CREDITED");
    if (r.makeup_for_attendance_id && cs === "CREDITED") {
      fulfilledIds.add(Number(r.makeup_for_attendance_id));
    }
    if (r.fulfilled_by_makeup_id) {
      fulfilledIds.add(Number(r.id));
    }
  }

  for (const row of attendanceRows) {
    const status = String(row.status || "").toLowerCase();
    const completionStatus =
      row.completion_status || (status === "present" ? "CREDITED" : "NOT_CREDITED");
    const isDuplicate = Boolean(Number(row.is_duplicate_topic || 0));
    const isMakeup = Boolean(Number(row.is_makeup || 0));

    if (status === "cancelled") {
      cancelledCount++;
      continue;
    }

    const isPhysical = status === "present" || status === "late";
    const isApprovedCredit = isPhysical && completionStatus === "CREDITED" && !isDuplicate;

    if (isPhysical) totalPhysicalAttended++;
    if (status === "late") lateCount++;
    if (status === "excused") excusedCount++;
    if (status === "absent") absentCount++;
    if (completionStatus === "PENDING_REVIEW") pendingReviewCount++;
    if (isDuplicate) repeatCount++;
    if (isMakeup && completionStatus === "CREDITED") makeupCreditedCount++;
    if ((status === "absent" || status === "excused") && !fulfilledIds.has(Number(row.id))) {
      outstandingMakeupsCount++;
    }
    if (isApprovedCredit) totalCreditedAll++;

    const classification = classifyCurriculumRow(row);

    switch (classification.group) {
      case "CBT": {
        if (isPhysical) cbtRawPhysical++;
        if (isApprovedCredit) {
          if (classification.slot) {
            if (!cbtCompletedSlots.has(classification.slot)) {
              cbtCompletedSlots.add(classification.slot);
            } else {
              // Deduplicate by requirement within the enrollment, independently of the stored duplicate flag (Finding 4)
              if (!isDuplicate) repeatCount++;
              cbtRepeatCredited++;
            }
          } else {
            // Unmapped/generic CBT credit - does NOT fill an unidentified core topic requirement (Finding 3)
            cbtUnslottedCredited++;
          }
        }
        break;
      }
      case "CBT_E": {
        if (isPhysical) cbteRawPhysical++;
        if (isApprovedCredit) {
          if (classification.slot) {
            if (!cbteCompletedSlots.has(classification.slot)) {
              cbteCompletedSlots.add(classification.slot);
            } else {
              if (!isDuplicate) repeatCount++;
              cbteRepeatCredited++;
            }
          } else {
            cbteUnslottedCredited++;
          }
        }
        break;
      }
      case "PE": {
        if (isPhysical) peRawPhysical++;
        if (isApprovedCredit) {
          if (classification.slot) {
            if (!peCompletedSlots.has(classification.slot)) {
              peCompletedSlots.add(classification.slot);
            } else {
              if (!isDuplicate) repeatCount++;
              peRepeatCredited++;
            }
          } else {
            peUnslottedCredited++;
          }
        }
        break;
      }
      case "ORIENTATION": {
        if (isApprovedCredit) orientationCredited++;
        break;
      }
      case "SHGM": {
        if (isPhysical) shgmPhysical++;
        if (isApprovedCredit) shgmCredited++;
        break;
      }
      case "INDIVIDUAL_COUNSELING": {
        if (isPhysical) indCounselingPhysical++;
        if (isApprovedCredit) indCounselingCredited++;
        break;
      }
      case "CONJOINT_FAMILY": {
        if (isPhysical) conjointFamilyPhysical++;
        if (isApprovedCredit) conjointFamilyCredited++;
        break;
      }
      default:
        break;
    }
  }

  // Merge formal CBT-E evaluations from patient_cbte_evaluations table (deduplicated by slot 1, 2, 3)
  for (const ev of cbteEvaluationRows || []) {
    const evalType = String(ev.evaluation_type || "").toUpperCase();
    if (evalType === "CBTE_1" || evalType === "CBTE-01") {
      cbteCompletedSlots.add(1);
    } else if (evalType === "CBTE_2" || evalType === "CBTE-02") {
      cbteCompletedSlots.add(2);
    } else if (evalType === "CBTE_3" || evalType === "CBTE-03") {
      cbteCompletedSlots.add(3);
    }
  }

  // Findings 3 & 4: Deduplicate strictly by requirement within enrollment;
  // NEVER fill missing slots using unidentified credits or repeated topic credits.
  // Missing topics remain unresolved; unmapped and repeat credits are tracked as additional/supplementary.
  const additionalCbtCredited = cbtRepeatCredited + cbtUnslottedCredited;
  const additionalCbteCredited = cbteRepeatCredited + cbteUnslottedCredited;
  const additionalPeCredited = peRepeatCredited + peUnslottedCredited;

  // Core completed counts (strictly capped at 28 CBT, 3 CBT-E, 12 PE)
  const cbtCompleted = Math.min(CORE_TARGETS.CBT, cbtCompletedSlots.size);
  const cbteCompleted = Math.min(CORE_TARGETS.CBT_E, cbteCompletedSlots.size);
  const peCompleted = Math.min(CORE_TARGETS.PE, peCompletedSlots.size);

  const totalCoreCompleted = cbtCompleted + cbteCompleted + peCompleted;
  const isCbtComplete = cbtCompleted >= CORE_TARGETS.CBT;
  const isCbteComplete = cbteCompleted >= CORE_TARGETS.CBT_E;
  const isPeComplete = peCompleted >= CORE_TARGETS.PE;
  const isCoreComplete = isCbtComplete && isCbteComplete && isPeComplete;

  const percentage = Math.min(
    100,
    Math.round((totalCoreCompleted / CORE_TARGETS.TOTAL_CORE) * 100)
  );

  const missingCbtTopics = CORE_CBT_TOPICS.filter((t) => !cbtCompletedSlots.has(t.sessionNumber));
  const missingCbteTopics = CORE_CBTE_TOPICS.filter((t) => !cbteCompletedSlots.has(t.sessionNumber));
  const missingPeTopics = CORE_PE_TOPICS.filter((t) => !peCompletedSlots.has(t.sessionNumber));

  const additionalPeMeetings = Math.max(0, peRawPhysical - peCompleted);
  const additionalCbtMeetings = Math.max(0, cbtRawPhysical - cbtCompleted);

  const totalSupplementaryCredited =
    shgmCredited +
    indCounselingCredited +
    conjointFamilyCredited +
    orientationCredited +
    additionalCbtCredited +
    additionalPeCredited;

  let curriculumPhaseKey = "phase1";
  let curriculumPhaseLabel = "Phase 1: Early Stabilization (1–14)";
  if (isCoreComplete) {
    curriculumPhaseKey = "pdcReady";
    curriculumPhaseLabel = "PDC Ready (All 43 Core Requirements Met)";
  } else if (totalCoreCompleted >= 29) {
    curriculumPhaseKey = "phase3";
    curriculumPhaseLabel = "Phase 3: Relapse Prevention & Reintegration (29–42)";
  } else if (totalCoreCompleted >= 15) {
    curriculumPhaseKey = "phase2";
    curriculumPhaseLabel = "Phase 2: Core CBT & Psychoeducation (15–28)";
  }

  const missingSummaryParts = [];
  if (missingCbtTopics.length > 0) {
    missingSummaryParts.push(`${missingCbtTopics.length} CBT (${cbtCompleted}/${CORE_TARGETS.CBT})`);
  }
  if (missingCbteTopics.length > 0) {
    const names = missingCbteTopics.map((t) => `CBT-E ${t.sessionNumber}`).join(", ");
    missingSummaryParts.push(`${missingCbteTopics.length} CBT-E [${names}] (${cbteCompleted}/${CORE_TARGETS.CBT_E})`);
  }
  if (missingPeTopics.length > 0) {
    missingSummaryParts.push(`${missingPeTopics.length} PE (${peCompleted}/${CORE_TARGETS.PE})`);
  }

  return {
    components: {
      cbt: {
        label: "CBT",
        completed: cbtCompleted,
        required: CORE_TARGETS.CBT,
        remaining: Math.max(0, CORE_TARGETS.CBT - cbtCompleted),
        isComplete: isCbtComplete,
        rawPhysical: cbtRawPhysical,
        additionalCredited: additionalCbtCredited,
        missingTopics: missingCbtTopics,
      },
      cbte: {
        label: "CBT-E",
        completed: cbteCompleted,
        required: CORE_TARGETS.CBT_E,
        remaining: Math.max(0, CORE_TARGETS.CBT_E - cbteCompleted),
        isComplete: isCbteComplete,
        rawPhysical: cbteRawPhysical,
        additionalCredited: additionalCbteCredited,
        missingTopics: missingCbteTopics,
      },
      pe: {
        label: "PE",
        completed: peCompleted,
        required: CORE_TARGETS.PE,
        remaining: Math.max(0, CORE_TARGETS.PE - peCompleted),
        isComplete: isPeComplete,
        rawPhysical: peRawPhysical,
        additionalCredited: additionalPeCredited,
        additionalMeetings: additionalPeMeetings,
        missingTopics: missingPeTopics,
      },
      totalCore: {
        label: "Total core requirements",
        completed: totalCoreCompleted,
        required: CORE_TARGETS.TOTAL_CORE,
        remaining: Math.max(0, CORE_TARGETS.TOTAL_CORE - totalCoreCompleted),
        isComplete: isCoreComplete,
        percentage,
      },
    },
    supplementary: {
      shgm: shgmCredited,
      shgmPhysical,
      indCounseling: indCounselingCredited,
      indCounselingPhysical,
      conjointFamily: conjointFamilyCredited,
      conjointFamilyPhysical,
      orientation: orientationCredited,
      additionalCbtCredited,
      additionalCbtMeetings,
      additionalPeCredited,
      additionalPeMeetings,
      totalSupplementaryCredited,
    },
    missingRequirements: {
      cbt: missingCbtTopics,
      cbte: missingCbteTopics,
      pe: missingPeTopics,
      totalMissingCount:
        missingCbtTopics.length + missingCbteTopics.length + missingPeTopics.length,
      summaryText:
        missingSummaryParts.length > 0
          ? `Incomplete core requirements: ${missingSummaryParts.join("; ")}`
          : "All 43 core curriculum requirements (28 CBT, 3 CBT-E, 12 PE) completed.",
    },
    tallies: {
      totalCreditedAll,
      totalPhysicalAttended,
      rawAttendedCore: cbtRawPhysical + cbteRawPhysical + peRawPhysical,
      pendingReviewCount,
      repeatCount,
      makeupCreditedCount,
      lateCount,
      excusedCount,
      absentCount,
      cancelledCount,
      outstandingMakeupsCount,
    },
    isCoreComplete,
    isPdcReady: isCoreComplete,
    curriculumPhaseKey,
    curriculumPhaseLabel,
    cbtGroup: cbtCompleted,
    cbteCompleted,
    psychoEd: peCompleted,
    shgm: shgmCredited,
    indCounseling: indCounselingCredited,
    conjointFamily: conjointFamilyCredited,
    attendedCore: totalCoreCompleted,
    coreRequired: CORE_TARGETS.TOTAL_CORE,
    rawCbtGroup: cbtRawPhysical,
    rawCbte: cbteRawPhysical,
    rawPsychoEd: peRawPhysical,
    rawAttendedCore: cbtRawPhysical + cbteRawPhysical + peRawPhysical,
    rawAttendedTotal: totalPhysicalAttended,
    pendingReviewCount,
    repeatCount,
    makeupCreditedCount,
    lateCount,
    excusedCount,
    absentCount,
    cancelledCount,
    percentage,
  };
}

/**
 * Fetches and computes unified curriculum progress for a single patient ID.
 * Bounds queries by current enrollment start date, allowing explicit carryover credits (Finding 5).
 * Uses only base attendance + sessions tables (no dependency on session_topics table).
 */
export async function getUnifiedPatientProgress(dbOrConn, patientId) {
  await ensureAttendanceCompletionSchema();

  let admissionBoundary = null;
  try {
    const [[p]] = await dbOrConn.query(
      "SELECT admission_date, rehab_start_date FROM patients WHERE id = ?",
      [patientId]
    );
    admissionBoundary = p?.admission_date || p?.rehab_start_date || null;
  } catch (_) {}

  let attRows = [];
  try {
    const [rows] = await dbOrConn.query(
      `SELECT a.*, s.session_name
       FROM attendance a
       LEFT JOIN sessions s ON s.id = a.session_id
       WHERE a.patient_id = ?
         AND (? IS NULL OR a.session_date >= ? OR a.is_carryover = 1)
       ORDER BY a.session_date ASC, a.id ASC`,
      [patientId, admissionBoundary, admissionBoundary]
    );
    attRows = rows || [];
  } catch (err) {
    console.warn("getUnifiedPatientProgress fallback query:", err.message);
    const [rows] = await dbOrConn.query(
      `SELECT * FROM attendance 
       WHERE patient_id = ? 
         AND (? IS NULL OR session_date >= ? OR is_carryover = 1)
       ORDER BY session_date ASC, id ASC`,
      [patientId, admissionBoundary, admissionBoundary]
    ).catch(() => [[]]);
    attRows = rows || [];
  }

  let cbteEvalRows = [];
  try {
    const [evals] = await dbOrConn.query(
      `SELECT id, patient_id, evaluation_type, evaluation_date, clinical_judgment
       FROM patient_cbte_evaluations
       WHERE patient_id = ?
         AND (? IS NULL OR evaluation_date >= ? OR is_carryover = 1)`,
      [patientId, admissionBoundary, admissionBoundary]
    );
    cbteEvalRows = evals || [];
  } catch (_) {
    // patient_cbte_evaluations table may not exist in some setups
  }

  return calculatePatientCurriculumProgress(attRows, cbteEvalRows);
}

/**
 * Fetches and computes unified curriculum progress for a list of patient IDs in bulk.
 * Bounds records to each patient's current enrollment (Finding 5).
 * Returns a Map<number, ProgressObject>.
 */
export async function getBulkUnifiedPatientProgress(dbOrConn, patientIds = []) {
  const cleanIds = Array.from(
    new Set((patientIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))
  );
  const resultMap = new Map();
  if (cleanIds.length === 0) return resultMap;

  await ensureAttendanceCompletionSchema();

  let attRows = [];
  try {
    const [rows] = await dbOrConn.query(
      `SELECT a.*, s.session_name
       FROM attendance a
       LEFT JOIN sessions s ON s.id = a.session_id
       LEFT JOIN patients p ON p.id = a.patient_id
       WHERE a.patient_id IN (?)
         AND (COALESCE(p.admission_date, p.rehab_start_date) IS NULL OR a.session_date >= COALESCE(p.admission_date, p.rehab_start_date) OR a.is_carryover = 1)
       ORDER BY a.session_date ASC, a.id ASC`,
      [cleanIds]
    );
    attRows = rows || [];
  } catch (err) {
    console.warn("getBulkUnifiedPatientProgress fallback query:", err.message);
    const [rows] = await dbOrConn.query(
      `SELECT a.* FROM attendance a
       LEFT JOIN patients p ON p.id = a.patient_id
       WHERE a.patient_id IN (?)
         AND (COALESCE(p.admission_date, p.rehab_start_date) IS NULL OR a.session_date >= COALESCE(p.admission_date, p.rehab_start_date) OR a.is_carryover = 1)
       ORDER BY a.session_date ASC, a.id ASC`,
      [cleanIds]
    ).catch(() => [[]]);
    attRows = rows || [];
  }

  let cbteEvalRows = [];
  try {
    const [evals] = await dbOrConn.query(
      `SELECT e.id, e.patient_id, e.evaluation_type, e.evaluation_date, e.clinical_judgment
       FROM patient_cbte_evaluations e
       LEFT JOIN patients p ON p.id = e.patient_id
       WHERE e.patient_id IN (?)
         AND (COALESCE(p.admission_date, p.rehab_start_date) IS NULL OR e.evaluation_date >= COALESCE(p.admission_date, p.rehab_start_date) OR e.is_carryover = 1)`,
      [cleanIds]
    );
    cbteEvalRows = evals || [];
  } catch (_) {
    // Ignore if table doesn't exist
  }

  const attByPatient = new Map();
  const evalsByPatient = new Map();
  for (const id of cleanIds) {
    attByPatient.set(id, []);
    evalsByPatient.set(id, []);
  }
  for (const r of attRows) {
    const pid = Number(r.patient_id);
    if (attByPatient.has(pid)) attByPatient.get(pid).push(r);
  }
  for (const ev of cbteEvalRows) {
    const pid = Number(ev.patient_id);
    if (evalsByPatient.has(pid)) evalsByPatient.get(pid).push(ev);
  }

  for (const id of cleanIds) {
    resultMap.set(
      id,
      calculatePatientCurriculumProgress(attByPatient.get(id) || [], evalsByPatient.get(id) || [])
    );
  }

  return resultMap;
}
