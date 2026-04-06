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
  useWindowDimensions,
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
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const isMobileLayout = Platform.OS !== 'web' || !isDesktopWeb;

  const navigation = useNavigation();
  const renderCompanyItem = ({ item } : { item : Company }) => (
    <View style={[styles.tableRow, isMobileLayout && { flexWrap: 'wrap', rowGap: 6, paddingHorizontal: 10 }]}>
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
        <View style={[styles.dashboardContainer, isMobileLayout && { width: '96%', padding: 14, borderRadius: 16 }]}>
          {/* Header */}
          <View style={[styles.headerRow, isMobileLayout && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
            <Text style={styles.headerTitle}>Super Admin Dashboard</Text>
            <View style={styles.adminBadge}>
              <Ionicons name="person-circle-outline" size={20} color="#A9C6E4" />
              <Text style={styles.adminText}>Super Admin</Text>
            </View>
          </View>

          {/* Top Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, isMobileLayout && { flexBasis: '100%' }]}>
              <MaterialIcons name="business" size={26} color="#22D3EE" />
              <Text style={styles.statNumber}>25</Text>
              <Text style={styles.statLabel}>Total Companies</Text>
            </View>
            <View style={[styles.statCard, isMobileLayout && { flexBasis: '100%' }]}>
              <Ionicons name="checkmark-done" size={26} color="#34D399" />
              <Text style={styles.statNumber}>22</Text>
              <Text style={styles.statLabel}>Active Subscriptions</Text>
            </View>
            <View style={[styles.statCard, isMobileLayout && { flexBasis: '100%' }]}>
              <Ionicons name="time-outline" size={26} color="#F59E0B" />
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Pending Onboarding</Text>
            </View>
            <View style={[styles.statCard, isMobileLayout && { flexBasis: '100%' }]}>
              <Ionicons name="cash-outline" size={26} color="#22D3EE" />
              <Text style={styles.statNumber}>5.2M</Text>
              <Text style={styles.statLabel}>Platform Assets</Text>
            </View>
          </View>

          {/* Client Companies */}
          <View style={styles.tableContainer}>
            <Text style={styles.sectionTitle}>Client Companies</Text>
            {!isMobileLayout && <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                Client Name
              </Text>
              <Text style={styles.tableHeaderText}>Status</Text>
              <Text style={styles.tableHeaderText}>Assets</Text>
              <Text style={styles.tableHeaderText}>Action</Text>
            </View>}
            <FlatList
              data={mockCompanies}
              keyExtractor={(item) => item.id}
              renderItem={renderCompanyItem}
            />
          </View>

          {/* Quick Actions */}
          <View style={[styles.actionsContainer, isMobileLayout && { flexDirection: 'column', gap: 8 }]}>
          <TouchableOpacity style={styles.actionPrimary}
                onPress={() => navigation.navigate("AddCompany" as never)}
                >
              <LinearGradient colors={["#0EA5E9", "#0F766E"]}
                style={styles.gradientButton}
                >
          <Text style={styles.actionBtnText}>Add New Company</Text>
          </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionSecondary}>
              <LinearGradient colors={["#3B82F6", "#1D4ED8"]}
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
  },
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  dashboardContainer: {
    width: Platform.OS === "web" ? "100%" : "100%",
    backgroundColor: "rgba(7, 24, 42, 0.82)",
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    shadowColor: "#001325",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  headerTitle: {
    color: "#E6F3FF",
    fontSize: 22,
    fontWeight: "700",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  adminText: {
    color: "#A9C6E4",
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
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    borderRadius: 15,
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
  },
  statNumber: {
    color: "#E6F3FF",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 5,
  },
  statLabel: {
    color: "#A9C6E4",
    fontSize: 13,
    marginTop: 3,
    textAlign: "center",
  },
  tableContainer: {
    marginVertical: 15,
  },
  sectionTitle: {
    color: "#E6F3FF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 6,
  },
  tableHeaderText: {
    flex: 1,
    color: "#E6F3FF",
    fontWeight: "bold",
    fontSize: 13,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(7, 24, 42, 0.92)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 8,
  },
  tableCell: {
    flex: 1,
    color: "#A9C6E4",
    textAlign: "center",
    fontSize: 13,
  },
  companyName: {
    flex: 2,
    textAlign: "left",
    paddingLeft: 8,
  },
  actionButton: {
    backgroundColor: "rgba(18, 45, 73, 0.86)",
    borderWidth: 1,
    borderColor: 'rgba(159, 207, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionText: {
    color: "#E6F3FF",
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
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    paddingTop: 10,
    borderTopColor: "rgba(159, 207, 255, 0.22)",
    borderTopWidth: 1,
  },
});
