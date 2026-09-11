import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b", marginBottom: 20 },
  kpiRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  kpi: { flexDirection: "column", alignItems: "flex-start" },
  kpiLabel: { fontSize: 9, color: "#64748b", marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: 700 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, marginTop: 12 },
  table: { display: "flex", width: "100%" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 6 },
  headerRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#0f172a", paddingBottom: 6, fontWeight: 700 },
  cell: { flex: 1 },
});

function formatMoney(amount: number) {
  return `${amount.toLocaleString("en-US")} EGP`;
}

export function FinancialReportPdf({
  from,
  to,
  totalRevenue,
  totalExpenses,
  totalEarnings,
  netProfit,
  branches,
}: {
  from: string;
  to: string;
  totalRevenue: number;
  totalExpenses: number;
  totalEarnings: number;
  netProfit: number;
  branches: { branchName: string; revenue: number; expenses: number; netProfit: number }[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>DentaFlow - Financial Report</Text>
        <Text style={styles.subtitle}>{from} to {to}</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Total Revenue</Text>
            <Text style={styles.kpiValue}>{formatMoney(totalRevenue)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Total Expenses</Text>
            <Text style={styles.kpiValue}>{formatMoney(totalExpenses)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Doctor Earnings</Text>
            <Text style={styles.kpiValue}>{formatMoney(totalEarnings)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Net Profit</Text>
            <Text style={styles.kpiValue}>{formatMoney(netProfit)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Branch Summary</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>Branch</Text>
            <Text style={styles.cell}>Revenue</Text>
            <Text style={styles.cell}>Expenses</Text>
            <Text style={styles.cell}>Net Profit</Text>
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
