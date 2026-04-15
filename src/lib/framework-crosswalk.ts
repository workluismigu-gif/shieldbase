// SOC 2 Trust Services Criteria → other frameworks mapping.
// Hand-curated from the AICPA Trust Services Criteria mapping document, ISO/IEC
// 27001:2022 Annex A, HIPAA Security Rule § 164.308–312, and PCI DSS 4.0.
// Not exhaustive — each TSC section lists the *primary* corresponding controls.

export interface CrosswalkRow {
  tsc: string;              // e.g. "CC6.1"
  tsc_title: string;
  iso27001?: string[];      // Annex A control IDs
  hipaa?: string[];         // § reference (administrative / physical / technical)
  pci_dss?: string[];       // PCI DSS 4.0 requirement IDs
  nist_csf?: string[];      // NIST CSF 2.0 subcategory
}

export const CROSSWALK: CrosswalkRow[] = [
  { tsc: "CC1.1", tsc_title: "Integrity & ethical values",
    iso27001: ["A.5.1","A.6.2"], hipaa: ["§164.308(a)(5)"], pci_dss: ["12.1","12.5"], nist_csf: ["GV.OC-01","GV.PO-01"] },
  { tsc: "CC1.2", tsc_title: "Board independence & oversight",
    iso27001: ["A.5.2","A.5.3"], hipaa: ["§164.308(a)(2)"], pci_dss: ["12.4"], nist_csf: ["GV.RM-01"] },
  { tsc: "CC1.3", tsc_title: "Organizational structures, reporting lines",
    iso27001: ["A.5.2"], hipaa: ["§164.308(a)(2)"], pci_dss: ["12.4"], nist_csf: ["GV.RR-01"] },
  { tsc: "CC1.4", tsc_title: "Commitment to competence",
    iso27001: ["A.6.3"], hipaa: ["§164.308(a)(5)"], pci_dss: ["12.6"], nist_csf: ["PR.AT-01"] },
  { tsc: "CC1.5", tsc_title: "Accountability enforcement",
    iso27001: ["A.6.4","A.6.5"], hipaa: ["§164.308(a)(1)(ii)(C)"], pci_dss: ["12.9"], nist_csf: ["GV.RR-02"] },

  { tsc: "CC2.1", tsc_title: "Information requirements & relevance",
    iso27001: ["A.5.14"], hipaa: ["§164.308(a)(1)"], pci_dss: ["12.10.1"], nist_csf: ["ID.AM-03"] },
  { tsc: "CC2.2", tsc_title: "Internal communication of objectives",
    iso27001: ["A.5.10","A.6.2"], hipaa: ["§164.308(a)(5)"], pci_dss: ["12.1.2"], nist_csf: ["GV.SC-02"] },
  { tsc: "CC2.3", tsc_title: "External communication",
    iso27001: ["A.5.19"], hipaa: ["§164.314"], pci_dss: ["12.8"], nist_csf: ["GV.SC-06"] },

  { tsc: "CC3.1", tsc_title: "Risk identification objectives",
    iso27001: ["A.5.7"], hipaa: ["§164.308(a)(1)(ii)(A)"], pci_dss: ["12.3.1"], nist_csf: ["ID.RA-01"] },
  { tsc: "CC3.2", tsc_title: "Risk identification & analysis",
    iso27001: ["A.5.2","A.5.7"], hipaa: ["§164.308(a)(1)(ii)(A)"], pci_dss: ["12.3.1"], nist_csf: ["ID.RA-02"] },
  { tsc: "CC3.3", tsc_title: "Fraud risk assessment",
    iso27001: ["A.5.24"], hipaa: ["§164.308(a)(6)"], pci_dss: ["12.10"], nist_csf: ["ID.RA-04"] },
  { tsc: "CC3.4", tsc_title: "Change risk identification",
    iso27001: ["A.6.2","A.8.32"], hipaa: ["§164.308(a)(8)"], pci_dss: ["6.5"], nist_csf: ["ID.RA-06"] },

  { tsc: "CC4.1", tsc_title: "Ongoing & periodic monitoring evaluations",
    iso27001: ["A.5.35","A.5.36"], hipaa: ["§164.308(a)(8)"], pci_dss: ["12.10.4"], nist_csf: ["DE.CM-01"] },
  { tsc: "CC4.2", tsc_title: "Deficiency evaluation & communication",
    iso27001: ["A.5.36"], hipaa: ["§164.308(a)(8)"], pci_dss: ["12.10.5"], nist_csf: ["RS.AN-01"] },

  { tsc: "CC5.1", tsc_title: "Control activities selection",
    iso27001: ["A.5.1"], hipaa: ["§164.306"], pci_dss: ["12.5"], nist_csf: ["GV.PO-02"] },
  { tsc: "CC5.2", tsc_title: "Technology general controls",
    iso27001: ["A.8.1","A.8.28"], hipaa: ["§164.312"], pci_dss: ["6.2","6.3"], nist_csf: ["PR.PS-06"] },
  { tsc: "CC5.3", tsc_title: "Policies & procedures",
    iso27001: ["A.5.1"], hipaa: ["§164.316"], pci_dss: ["12.1"], nist_csf: ["GV.PO-01"] },

  { tsc: "CC6.1", tsc_title: "Logical access restrictions",
    iso27001: ["A.5.15","A.8.2","A.8.3","A.8.5"], hipaa: ["§164.312(a)(1)"], pci_dss: ["7.1","8.1","8.2"], nist_csf: ["PR.AA-01","PR.AA-02"] },
  { tsc: "CC6.2", tsc_title: "User registration & authorization",
    iso27001: ["A.5.16","A.5.18"], hipaa: ["§164.308(a)(4)"], pci_dss: ["8.2"], nist_csf: ["PR.AA-03"] },
  { tsc: "CC6.3", tsc_title: "Role-based access & least privilege",
    iso27001: ["A.8.2","A.8.3"], hipaa: ["§164.308(a)(3)"], pci_dss: ["7.2"], nist_csf: ["PR.AA-05"] },
  { tsc: "CC6.4", tsc_title: "Physical access to facilities",
    iso27001: ["A.7.1","A.7.2","A.7.3"], hipaa: ["§164.310(a)(1)"], pci_dss: ["9.1","9.2"], nist_csf: ["PR.PS-01"] },
  { tsc: "CC6.5", tsc_title: "Logical & physical protections on media",
    iso27001: ["A.7.10","A.7.14"], hipaa: ["§164.310(d)(1)"], pci_dss: ["9.4"], nist_csf: ["PR.DS-02"] },
  { tsc: "CC6.6", tsc_title: "External access restrictions / perimeter",
    iso27001: ["A.8.20","A.8.22","A.8.23"], hipaa: ["§164.312(e)(1)"], pci_dss: ["1.2","1.3","1.4"], nist_csf: ["PR.IR-01"] },
  { tsc: "CC6.7", tsc_title: "Data-in-transit protection",
    iso27001: ["A.8.24","A.8.26"], hipaa: ["§164.312(e)(1)"], pci_dss: ["4.2"], nist_csf: ["PR.DS-01"] },
  { tsc: "CC6.8", tsc_title: "Malware protection & detection",
    iso27001: ["A.8.7"], hipaa: ["§164.308(a)(5)(ii)(B)"], pci_dss: ["5.1","5.2","5.3"], nist_csf: ["DE.CM-03"] },

  { tsc: "CC7.1", tsc_title: "Vulnerability monitoring",
    iso27001: ["A.8.8","A.8.15"], hipaa: ["§164.308(a)(1)(ii)(B)"], pci_dss: ["11.3"], nist_csf: ["ID.RA-01"] },
  { tsc: "CC7.2", tsc_title: "Anomaly & event detection",
    iso27001: ["A.8.15","A.8.16"], hipaa: ["§164.312(b)"], pci_dss: ["10.4","10.5"], nist_csf: ["DE.AE-02"] },
  { tsc: "CC7.3", tsc_title: "Security event evaluation",
    iso27001: ["A.5.24","A.5.25"], hipaa: ["§164.308(a)(6)(ii)"], pci_dss: ["12.10.4"], nist_csf: ["RS.AN-03"] },
  { tsc: "CC7.4", tsc_title: "Incident response program",
    iso27001: ["A.5.24","A.5.26","A.5.27"], hipaa: ["§164.308(a)(6)"], pci_dss: ["12.10"], nist_csf: ["RS.MA-01"] },
  { tsc: "CC7.5", tsc_title: "Incident recovery",
    iso27001: ["A.5.29","A.5.30"], hipaa: ["§164.308(a)(7)"], pci_dss: ["12.10.6"], nist_csf: ["RC.RP-01"] },

  { tsc: "CC8.1", tsc_title: "Change management procedures",
    iso27001: ["A.8.32"], hipaa: ["§164.308(a)(8)"], pci_dss: ["6.5"], nist_csf: ["PR.PS-06"] },

  { tsc: "CC9.1", tsc_title: "Risk mitigation via business continuity",
    iso27001: ["A.5.29","A.5.30"], hipaa: ["§164.308(a)(7)"], pci_dss: ["12.10.2"], nist_csf: ["RC.RP-01"] },
  { tsc: "CC9.2", tsc_title: "Vendor & third-party risk",
    iso27001: ["A.5.19","A.5.20","A.5.21"], hipaa: ["§164.308(b)","§164.314"], pci_dss: ["12.8","12.9"], nist_csf: ["GV.SC-06"] },

  { tsc: "A1.1", tsc_title: "Capacity monitoring",
    iso27001: ["A.8.6"], hipaa: ["§164.312(a)(2)(ii)"], pci_dss: [], nist_csf: ["PR.PS-02"] },
  { tsc: "A1.2", tsc_title: "Backup & recovery",
    iso27001: ["A.8.13"], hipaa: ["§164.308(a)(7)(ii)(A)"], pci_dss: ["12.10.1"], nist_csf: ["PR.DS-11"] },
  { tsc: "A1.3", tsc_title: "Business continuity testing",
    iso27001: ["A.5.29","A.5.30"], hipaa: ["§164.308(a)(7)(ii)(D)"], pci_dss: ["12.10.2"], nist_csf: ["RC.RP-04"] },

  { tsc: "C1.1", tsc_title: "Confidentiality controls identification",
    iso27001: ["A.5.12","A.5.13"], hipaa: ["§164.502"], pci_dss: ["3.1"], nist_csf: ["PR.DS-01"] },
  { tsc: "C1.2", tsc_title: "Confidentiality disposal",
    iso27001: ["A.8.10"], hipaa: ["§164.310(d)(2)"], pci_dss: ["9.4.7"], nist_csf: ["PR.DS-03"] },

  { tsc: "PI1.1", tsc_title: "Processing integrity objectives",
    iso27001: ["A.8.24"], hipaa: [], pci_dss: [], nist_csf: ["PR.DS-10"] },
  { tsc: "PI1.2", tsc_title: "System inputs",
    iso27001: ["A.8.28"], hipaa: [], pci_dss: [], nist_csf: ["PR.DS-10"] },
  { tsc: "PI1.3", tsc_title: "System processing",
    iso27001: ["A.8.28"], hipaa: [], pci_dss: [], nist_csf: ["PR.DS-10"] },
  { tsc: "PI1.4", tsc_title: "System outputs",
    iso27001: ["A.8.28"], hipaa: [], pci_dss: [], nist_csf: ["PR.DS-10"] },
  { tsc: "PI1.5", tsc_title: "System data retention",
    iso27001: ["A.8.10","A.8.13"], hipaa: ["§164.316(b)(2)(i)"], pci_dss: ["3.2"], nist_csf: ["PR.DS-04"] },
];

export function crosswalkToCsv(rows: CrosswalkRow[]): string {
  const head = ["TSC","Title","ISO 27001 Annex A","HIPAA","PCI DSS 4.0","NIST CSF 2.0"];
  const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push([
      r.tsc,
      esc(r.tsc_title),
      esc((r.iso27001 ?? []).join("; ")),
      esc((r.hipaa ?? []).join("; ")),
      esc((r.pci_dss ?? []).join("; ")),
      esc((r.nist_csf ?? []).join("; ")),
    ].join(","));
  }
  return lines.join("\n");
}
