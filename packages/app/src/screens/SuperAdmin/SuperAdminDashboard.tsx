import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  SafeAreaView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Company {
  id: string;
  name: string;
  status: "Active" | "Pending" | "Inactive";
  assets: number;
}

// ✅ Mock data
const mockCompanies: Company[] = [
  { id: "1", name: "TechVision Pvt Ltd", status: "Active", assets: 125 },
  { id: "2", name: "GreenField Solutions", status: "Pending", assets: 0 },
  { id: "3", name: "UrbanEdge Systems", status: "Active", assets: 87 },
  { id: "4", name: "CloudX Technologies", status: "Inactive", assets: 0 },
];


export default function SuperAdminDashboard() {

  const navigation = useNavigation();
  const renderCompanyItem = ({ item } : { item : Company }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.companyName]}>{item.name}</Text>
      <Text style={styles.tableCell}>{item.status}</Text>
      <Text style={styles.tableCell}>{item.assets}</Text>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={styles.actionText}>
          {item.status === "Pending" ? "Onboard" : "View"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground
          source={require("../../assets/Company-bg.webp")} // 👈 place your background image in /assets folder
          style={styles.backgroundImage}
          resizeMode="cover"
          blurRadius={5}
        >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.dashboardContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Super Admin Dashboard</Text>
            <View style={styles.adminBadge}>
              <Ionicons name="person-circle-outline" size={20} color="#fff" />
              <Text style={styles.adminText}>Super Admin</Text>
            </View>
          </View>

          {/* Top Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="business" size={26} color="#fff" />
              <Text style={styles.statNumber}>25</Text>
              <Text style={styles.statLabel}>Total Companies</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-done" size={26} color="#fff" />
              <Text style={styles.statNumber}>22</Text>
              <Text style={styles.statLabel}>Active Subscriptions</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={26} color="#fff" />
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Pending Onboarding</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={26} color="#fff" />
              <Text style={styles.statNumber}>5.2M</Text>
              <Text style={styles.statLabel}>Platform Assets</Text>
            </View>
          </View>

          {/* Client Companies */}
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>Client Companies</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                Company Name
              </Text>
              <Text style={styles.tableHeaderText}>Status</Text>
              <Text style={styles.tableHeaderText}>Assets</Text>
              <Text style={styles.tableHeaderText}>Action</Text>
            </View>
            <FlatList
              data={mockCompanies}
              keyExtractor={(item) => item.id}
              renderItem={renderCompanyItem}
            />
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionPrimary}
                onPress={() => navigation.navigate("AddCompany" as never)}
                >
          <LinearGradient colors={["#00c6ff", "#0072ff"]}
                style={styles.gradientButton}
                >
          <Text style={styles.actionBtnText}>Add New Company</Text>
          </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionSecondary}>
          <LinearGradient colors={["#ff758c", "#ff7eb3"]}
                 style={styles.gradientButton}
                >
          <Text style={styles.actionBtnText}>Manage Subscriptions</Text>
          </LinearGradient>
          </TouchableOpacity>
          </View>

          {/* Bottom Navigation */}
          <View style={styles.navBar}>
            <Ionicons name="home" size={22} color="#fff" />
            <Ionicons name="people" size={22} color="#fff" />
            <Ionicons name="settings" size={22} color="#fff" />
            <Ionicons name="phone-portrait" size={22} color="#fff" />
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  dashboardContainer: {
    width: Platform.OS === "web" ? "85%" : "95%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 25,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    //backdropFilter: "blur(10px)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  headerTitle: {
    color: "#000000ff",
    fontSize: 22,
    fontWeight: "700",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  adminText: {
    color: "#000000ff",
    marginLeft: 5,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  statCard: {
    flexBasis: "48%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 15,
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
  },
  statNumber: {
    color: "#000000ff",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 5,
  },
  statLabel: {
    color: "#000000ff",
    fontSize: 13,
    marginTop: 3,
    textAlign: "center",
  },
  tableContainer: {
    marginVertical: 15,
  },
  sectionTitle: {
    color: "#000000ff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  tableHeaderText: {
    flex: 1,
    color: "#000000ff",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 8,
  },
  tableCell: {
    flex: 1,
    color: "#000000ff",
    textAlign: "center",
    fontSize: 13,
  },
  companyName: {
    flex: 2,
    textAlign: "left",
    paddingLeft: 8,
  },
  actionButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionText: {
    color: "#000000ff",
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginVertical: 20,
  },
  actionPrimary: {
    flex: 1,
    marginHorizontal: 5,
  },
  actionSecondary: {
    flex: 1,
    marginHorizontal: 5,
  },
  gradientButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#000000ff",
    fontWeight: "bold",
    fontSize: 14,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 10,
    borderTopColor: "rgba(255,255,255,0.2)",
    borderTopWidth: 1,
  },
});
