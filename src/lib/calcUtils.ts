// --- Math Engine for Scientific Lab Calculators ---

export const U_CONV: Record<string, Record<string, number>> = {
  // To Base (Liters, Molar, Grams)
  vol: { 'mL': 0.001, 'µL': 0.000001, 'L': 1 },
  conc: { 'mM': 0.001, 'µM': 0.000001, 'nM': 0.000000001, 'M': 1 },
  mass: { 'mg': 0.001, 'g': 1, 'µg': 0.000001 },
  mw: { 'g/mol': 1 }
};

export function performCalculation(type: string, vals: Record<string, string>, units: Record<string, string>, target: string | null) {
  const v = { ...vals };
  
  // Normalize all to base units
  const base: Record<string, number> = {};
  const fields = type === 'dilution' ? ['c1', 'v1', 'c2', 'v2'] : ['c', 'v', 'mw', 'm'];
  
  fields.forEach(f => {
    const rawVal = parseFloat(v[f]);
    if (!isNaN(rawVal)) {
      const uType = f.startsWith('c') ? 'conc' : f.startsWith('v') ? 'vol' : f === 'm' ? 'mass' : 'mw';
      const factor = U_CONV[uType]?.[units[f]] || 1;
      base[f] = rawVal * factor;
    }
  });

  if (target) {
    if (type === 'dilution') {
      // C1V1 = C2V2
      if (target === 'c1' && base.v1 && base.c2 && base.v2) base.c1 = (base.c2 * base.v2) / base.v1;
      else if (target === 'v1' && base.c1 && base.c2 && base.v2) base.v1 = (base.c2 * base.v2) / base.c1;
      else if (target === 'c2' && base.c1 && base.v1 && base.v2) base.c2 = (base.c1 * base.v1) / base.v2;
      else if (target === 'v2' && base.c1 && base.v1 && base.c2) base.v2 = (base.c1 * base.v1) / base.c2;
    } else {
      // Molarity: Mass = Conc * Vol * MW
      if (target === 'c' && base.v && base.mw && base.m) base.c = base.m / (base.v * base.mw);
      else if (target === 'v' && base.c && base.mw && base.m) base.v = base.m / (base.c * base.mw);
      else if (target === 'mw' && base.c && base.v && base.m) base.mw = base.m / (base.c * base.v);
      else if (target === 'm' && base.c && base.v && base.mw) base.m = base.c * base.v * base.mw;
    }

    // Convert base result back to target unit
    const uType = target.startsWith('c') ? 'conc' : target.startsWith('v') ? 'vol' : target === 'm' ? 'mass' : 'mw';
    const factor = U_CONV[uType]?.[units[target]] || 1;
    v[target] = (base[target] / factor).toFixed(5);
    // Remove trailing zeros and decimal if not needed
    v[target] = parseFloat(v[target]).toString();
  }

  // Cleanup
  Object.keys(v).forEach(k => {
    if (v[k] === "NaN" || v[k] === "Infinity" || v[k] === "-Infinity") v[k] = "";
  });

  return { values: v, targetField: target };
}
