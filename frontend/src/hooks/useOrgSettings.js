import { useEffect, useState } from "react";
import api from "../api/axios.js";

// Shared branding info (name, logo, address, email, admission/admin numbers)
// used by the sidebar and by generated reports/certificates.
export default function useOrgSettings() {
  const [org, setOrg] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get("/settings").then(({ data }) => {
      if (mounted) setOrg(data.settings);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  return org;
}