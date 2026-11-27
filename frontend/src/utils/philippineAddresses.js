import geo from "phil-reg-prov-mun-brgy";

function toTitleCase(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRegionName(name) {
  if (!name) return "";
  return name
    .replace(/\(([^)]+)\)/, (m, p) => "(" + toTitleCase(p) + ")")
    .replace(/REGION/i, "Region")
    .replace(/NATIONAL CAPITAL REGION/i, "National Capital Region")
    .replace(/CORDILLERA ADMINISTRATIVE REGION/i, "Cordillera Administrative Region")
    .replace(/AUTONOMOUS REGION IN MUSLIM MINDANAO/i, "Autonomous Region in Muslim Mindanao");
}

export function formatProvinceName(name) {
  if (!name) return "";
  return toTitleCase(name);
}

export function formatCityName(name) {
  if (!name) return "";
  let clean = name.replace(/\s*\(capital\)/i, "").trim();
  clean = clean.replace(/\s*\([^)]+\)/g, "").trim();
  if (/^city of\s+/i.test(clean)) {
    clean = clean.replace(/^city of\s+/i, "") + " City";
  }
  return toTitleCase(clean);
}

export function formatBarangayName(name) {
  if (!name) return "";
  return toTitleCase(name);
}

// Bicol & Albay common postal codes mapping for quick auto-fill
const COMMON_ZIP_CODES = {
  "malinao": "4512",
  "tiwi": "4513",
  "tabaco city": "4511",
  "tabaco": "4511",
  "legazpi city": "4500",
  "legazpi": "4500",
  "daraga": "4501",
  "camalig": "4502",
  "guinobatan": "4503",
  "ligao city": "4504",
  "ligao": "4504",
  "oas": "4505",
  "polangui": "4506",
  "libon": "4507",
  "santo domingo": "4508",
  "bacacay": "4509",
  "malilipot": "4510",
  "manito": "4514",
  "pio duran": "4516",
  "jovellar": "4515",
  "rapu-rapu": "4517",
};

export function getZipCodeByCity(cityName) {
  if (!cityName) return null;
  const key = String(cityName).trim().toLowerCase();
  return COMMON_ZIP_CODES[key] || null;
}

// Get all 17 regions in the Philippines
export function getRegions() {
  return (geo.regions || []).map((r) => ({
    code: r.reg_code,
    name: formatRegionName(r.name),
    rawName: r.name,
  }));
}

// Resolve region code by code, name, or raw name
export function findRegionCode(regionCodeOrName) {
  if (!regionCodeOrName) return "";
  const q = String(regionCodeOrName).trim().toLowerCase();
  const found = (geo.regions || []).find(
    (r) =>
      r.reg_code === regionCodeOrName ||
      r.name.toLowerCase() === q ||
      formatRegionName(r.name).toLowerCase() === q ||
      q.includes(r.name.toLowerCase()) ||
      (r.reg_code === "05" && q.includes("bicol"))
  );
  return found ? found.reg_code : "";
}

// Get provinces for a region
export function getProvincesByRegion(regionCodeOrName) {
  const regCode = findRegionCode(regionCodeOrName);
  if (!regCode) return [];
  const provs = geo.getProvincesByRegion(regCode) || [];
  return provs.map((p) => ({
    code: p.prov_code,
    name: formatProvinceName(p.name),
    rawName: p.name,
    regCode: p.reg_code,
  }));
}

// Resolve province code
export function findProvinceCode(provinceCodeOrName, regCode) {
  if (!provinceCodeOrName) return "";
  const q = String(provinceCodeOrName).trim().toLowerCase();
  const allProvs = regCode ? geo.getProvincesByRegion(regCode) || [] : geo.provinces || [];
  const found = allProvs.find(
    (p) =>
      p.prov_code === provinceCodeOrName ||
      p.name.toLowerCase() === q ||
      formatProvinceName(p.name).toLowerCase() === q ||
      p.name.toLowerCase().includes(q)
  );
  return found ? found.prov_code : "";
}

// Get cities/municipalities for a province
export function getCitiesByProvince(provinceCodeOrName, regCode) {
  const provCode = findProvinceCode(provinceCodeOrName, regCode);
  if (!provCode) return [];
  const cities = geo.getCityMunByProvince(provCode) || [];
  return cities.map((c) => ({
    code: c.mun_code,
    name: formatCityName(c.name),
    rawName: c.name,
    provCode: c.prov_code,
  }));
}

// Resolve municipality code
export function findCityCode(cityCodeOrName, provCode) {
  if (!cityCodeOrName) return "";
  const q = String(cityCodeOrName).trim().toLowerCase();
  const allCities = provCode ? geo.getCityMunByProvince(provCode) || [] : geo.city_mun || [];
  const found = allCities.find(
    (c) =>
      c.mun_code === cityCodeOrName ||
      c.name.toLowerCase() === q ||
      formatCityName(c.name).toLowerCase() === q ||
      formatCityName(c.name).toLowerCase().replace(/\s+city$/i, "") === q.replace(/\s+city$/i, "")
  );
  return found ? found.mun_code : "";
}

// Get barangays for a city/municipality
export function getBarangaysByCity(cityCodeOrName, provCode) {
  const munCode = findCityCode(cityCodeOrName, provCode);
  if (!munCode) return [];
  const brgys = geo.getBarangayByMun(munCode) || [];
  return brgys.map((b) => ({
    name: formatBarangayName(b.name),
    rawName: b.name,
    munCode: b.mun_code,
  }));
}
