import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ControlLite {
  id?: string;
  control_id?: string;
  category: string;
  title: string;
  status: string;
  severity?: string;
}

interface OrgLite {
  name?: string;
  frameworks?: string[];
}

function header(doc: jsPDF, title: string, org: OrgLite) {
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("ShieldBase", 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`${org.name ?? "Organization"} • ${new Date().toLocaleDateString()}`, 14, 25);
  doc.setDrawColor(230);
  doc.line(14, 29, 196, 29);
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 40);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: "right" });
    doc.text("Confidential — Auditor copy", 14, 290);
  }
}

export function generateGapAnalysisPDF(org: OrgLite, controls: ControlLite[]): void {
  const doc = new jsPDF();
  header(doc, "SOC 2 Gap Analysis", org);

  const compliant = controls.filter(c => c.status === "compliant").length;
  const partial = controls.filter(c => c.status === "partial").length;
  const nonCompliant = controls.filter(c => c.status === "non_compliant").length;
  const notAssessed = controls.filter(c => c.status === "not_assessed").length;
  const total = controls.length || 1;
  const score = Math.round((compliant / total) * 100);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Framework: ${(org.frameworks ?? ["SOC 2"]).join(", ").toUpperCase()}`, 14, 48);
  doc.text(`Total controls assessed: ${controls.length}`, 14, 54);
  doc.text(`Readiness score: ${score}%`, 14, 60);

  autoTable(doc, {
    startY: 66,
    head: [["Status", "Count", "% of total"]],
    body: [
      ["Compliant", String(compliant), `${Math.round(compliant / total * 100)}%`],
      ["Partial", String(partial), `${Math.round(partial / total * 100)}%`],
      ["Non-compliant", String(nonCompliant), `${Math.round(nonCompliant / total * 100)}%`],
      ["Not assessed", String(notAssessed), `${Math.round(notAssessed / total * 100)}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  const grouped: Record<string, ControlLite[]> = {};
  for (const c of controls) {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  }

  const rows: string[][] = [];
  for (const [cat, items] of Object.entries(grouped).sort()) {
    for (const c of items) {
      rows.push([cat, c.control_id ?? c.id ?? "", c.title, c.status.replace("_", " "), c.severity ?? "-"]);
    }
  }

  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
    head: [["Category", "ID", "Control", "Status", "Severity"]],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 20 },
      2: { cellWidth: 80 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(`gap-analysis-${(org.name ?? "org").replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

interface EvidenceLite {
  control_id: string;
  evidence_type: string;
  collected_at: string;
  evidence_data: { file_name?: string; notes?: string };
}

export function generateEvidencePackagePDF(org: OrgLite, evidence: EvidenceLite[]): void {
  const doc = new jsPDF();
  header(doc, "Evidence Package", org);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Total evidence items: ${evidence.length}`, 14, 48);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 54);

  const rows = evidence
    .sort((a, b) => a.control_id.localeCompare(b.control_id))
    .map(e => [
      e.control_id.replace(/_/g, " "),
      e.evidence_type,
      e.evidence_data?.file_name ?? "—",
      new Date(e.collected_at).toLocaleDateString(),
      e.evidence_data?.notes ?? "",
    ]);

  autoTable(doc, {
    startY: 62,
    head: [["Control / evidence key", "Type", "File", "Collected", "Notes"]],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 22 },
      2: { cellWidth: 48 },
      3: { cellWidth: 22 },
      4: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(`evidence-package-${(org.name ?? "org").replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
