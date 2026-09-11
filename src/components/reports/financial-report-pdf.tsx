import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Amiri",
  fonts: [
    { src: "/fonts/Amiri-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Amiri-Bold.ttf", fontWeight: "bold" },
  ],
});

// Amiri is a Naskh calligraphic font — its ligatures break when react-pdf's
// default hyphenation engine splits Arabic words across lines.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Amiri", direction: "rtl" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4, textAlign: "right" },
  subtitle: { fontSize: 11, color: "#64748b", marginBottom: 20, textAlign: "right" },
  kpiRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 20 },
  kpi: { flexDirection: "column", alignItems: "flex-end" },
  kpiLabel: { fontSize: 10, color: "#64748b", marginBottom: 4, textAlign: "right" },
  kpiValue: { fontSize: 17, fontWeight: 700, textAlign: "right" },
  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 12, textAlign: "right" },
  table: { display: "flex", width: "100%" },
  row: { flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 6 },
  headerRow: {
    flexDirection: "row-reverse",
    borderBottomWidth: 2,
    borderBottomColor: "#0f172a",
    paddingBottom: 6,
    fontWeight: 700,
  },
  cell: { flex: 1, textAlign: "right" },
});

function formatMoney(amount: number) {
  return `${amount.toLocaleString("en-US")} جنيه`;
}

export function FinancialReportPdf({
  from,
  to,
  totalRevenue,
  totalExpenses,
  netProfit,
  branches,
}: {
  from: string;
  to: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  branches: { branchName: string; revenue: number; expenses: number; netProfit: number }[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>DentaFlow - التقرير المالي</Text>
        <Text style={styles.subtitle}>
          من {from} إلى {to}
        </Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>إجمالي الإيرادات</Text>
            <Text style={styles.kpiValue}>{formatMoney(totalRevenue)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>إجمالي المصروفات</Text>
            <Text style={styles.kpiValue}>{formatMoney(totalExpenses)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>صافي الربح</Text>
            <Text style={styles.kpiValue}>{formatMoney(netProfit)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>ملخص الفروع</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>الفرع</Text>
            <Text style={styles.cell}>الإيرادات</Text>
            <Text style={styles.cell}>المصروفات</Text>
            <Text style={styles.cell}>صافي الربح</Text>
          </View>
          {branches.map((b) => (
            <View style={styles.row} key={b.branchName}>
              <Text style={styles.cell}>{b.branchName}</Text>
              <Text style={styles.cell}>{formatMoney(b.revenue)}</Text>
              <Text style={styles.cell}>{formatMoney(b.expenses)}</Text>
              <Text style={styles.cell}>{formatMoney(b.netProfit)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
