import { useFocusEffect } from 'expo-router';
import { JSX, useCallback, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Colors, FixedColors } from '../../constants/theme';
import { getCategories, getTransactions, initDatabase } from '../utils/storage';

type WeeklyData = { label: string; total: number }[];
type PaymentData = { name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number }[];
type CategoryData = { name: string; amount: number; color: string; legendFontColor: string; legendFontSize: number }[];

const screenWidth = Dimensions.get('window').width;

export default function StatsScreen(): JSX.Element {
  const [chartData, setChartData] = useState<{
    weeklyData: WeeklyData;
    paymentData: PaymentData;
    categoryData: CategoryData;
  }>({
    weeklyData: [],
    paymentData: [],
    categoryData: []
  });
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [categories, setCategories] = useState<any[]>([]);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  const loadChartData = async () => {
    await initDatabase();
    const transactions = await getTransactions();
    const cats = await getCategories('expense');
    setCategories(cats);

    const year = selectedMonth.getFullYear();
    const monthIndex = selectedMonth.getMonth();

    const expenses = transactions.filter((t: any) => {
      if (t.type !== 'expense') return false;
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === monthIndex && transactionDate.getFullYear() === year;
    });

    const weeklyExpenses = calculateWeeklyExpenses(expenses, selectedMonth);
    const paymentExpenses = calculatePaymentExpenses(expenses);
    const categoryExpenses = await calculateCategoryExpenses(year, monthIndex + 1, cats, expenses);

    setChartData({
      weeklyData: weeklyExpenses,
      paymentData: paymentExpenses,
      categoryData: categoryExpenses
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadChartData();
    }, [selectedMonth])
  );

  const calculateWeeklyExpenses = (expenses: any[], month: Date): WeeklyData => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const weeks = [
      { label: '1-7', start: 1, end: 7, total: 0 },
      { label: '8-14', start: 8, end: 14, total: 0 },
      { label: '15-21', start: 15, end: 21, total: 0 },
      { label: '22-28', start: 22, end: 28, total: 0 }
    ];

    if (daysInMonth > 28) {
      weeks.push({ label: `29-${daysInMonth}`, start: 29, end: daysInMonth, total: 0 });
    }

    expenses.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      if (transactionDate.getMonth() === monthIndex && transactionDate.getFullYear() === year) {
        const day = transactionDate.getDate();
        const weekIndex = weeks.findIndex(week => day >= week.start && day <= week.end);
        if (weekIndex !== -1) {
          weeks[weekIndex].total += transaction.amount;
        }
      }
    });

    return weeks.map(week => ({ label: week.label, total: week.total }));
  };

  const calculatePaymentExpenses = (expenses: any[]): PaymentData => {
    const paymentMethods: { [key: string]: number } = {};
    expenses.forEach(transaction => {
      const method = transaction.payment_method === 'cash' ? 'Espèces' : 'Électronique';
      paymentMethods[method] = (paymentMethods[method] || 0) + transaction.amount;
    });

    return Object.entries(paymentMethods).map(([name, amount], index) => ({
      name,
      amount,
      color: index === 0 ? FixedColors.brandBlue : '#4CAF50',
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  };

  const calculateCategoryExpenses = async (year: number, month: number, categories: any[], expenses: any[]): Promise<CategoryData> => {
    if (expenses.length === 0) {
      return [];
    }

    const categoryTotals: { [key: string]: number } = {};
    
    expenses.forEach(transaction => {
      const category = transaction.category || 'Divers';
      categoryTotals[category] = (categoryTotals[category] || 0) + transaction.amount;
    });

    const result = Object.entries(categoryTotals).map(([categoryName, total]) => {
      const category = categories.find(cat => cat.name === categoryName);
      return {
        name: categoryName,
        amount: total,
        color: category?.color || FixedColors.brandBlue,
        legendFontColor: colors.text,
        legendFontSize: 12,
      };
    });

    return result;
  };

  const formatAmount = (amount: number) =>
    amount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const getMonthName = (date: Date) =>
    date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + direction, 1);
    setSelectedMonth(newDate);
  };

  const getPercentage = (amount: number, total: number) => {
    if (total === 0) return "0%";
    return ((amount / total) * 100).toFixed(1) + "%";
  };

  const categoryTotal = chartData.categoryData.reduce((s, d) => s + d.amount, 0);

  // Styles dynamiques basés sur le mode
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Carte pour la partie supérieure
    headerCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    monthText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.tint,
    },
    currentMonth: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    daysInfo: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    chartCard: {
      margin: 16,
      padding: 20,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    noData: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginVertical: 20,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#1C1F2A' : '#f8f9fa',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableHeaderText: {
      flex: 1,
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#1C1F2A' : '#f0f0f0',
    },
    tableCell: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '500',
    },
    legendText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    centerTextContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    centerText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    centerSubText: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
  });

  // Configuration du chart avec les couleurs du thème
  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => isDarkMode ? `rgba(10, 126, 164, ${opacity})` : `rgba(10, 126, 164, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: FixedColors.brandBlue
    },
    propsForBackgroundLines: {
      stroke: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: 'bold',
      fill: colors.text,
    }
  };

  const pieChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
  };

  return (
    <ScrollView style={dynamicStyles.container}>
      {/* Carte pour la partie supérieure */}
      <View style={dynamicStyles.headerCard}>
        <Text style={dynamicStyles.title}>Statistiques</Text>
        <Text style={dynamicStyles.subtitle}>Analyses de vos dépenses</Text>

        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Text style={dynamicStyles.monthText}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.monthInfo}>
            <Text style={dynamicStyles.currentMonth}>{getMonthName(selectedMonth)}</Text>
            <Text style={dynamicStyles.daysInfo}>{getDaysInMonth(selectedMonth)} jours</Text>
          </View>
          
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Text style={dynamicStyles.monthText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GRAPHIQUE LINÉAIRE DES SEMAINES */}
      <View style={dynamicStyles.chartCard}>
        <Text style={dynamicStyles.chartTitle}>
          📈 Évolution par jours
        </Text>
        {chartData.weeklyData.length > 0 && chartData.weeklyData.some(w => w.total > 0) ? (
          <>
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: chartData.weeklyData.map(w => w.label),
                  datasets: [
                    {
                      data: chartData.weeklyData.map(w => w.total),
                      color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
                      strokeWidth: 3
                    }
                  ]
                }}
                width={screenWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withVerticalLines={false}
                withHorizontalLines={true}
                withHorizontalLabels={true}
                withVerticalLabels={true}
              />
            </View>
            
            <View style={styles.weeksTable}>
              <View style={dynamicStyles.tableHeader}>
                <Text style={dynamicStyles.tableHeaderText}>Jours</Text>
                <Text style={dynamicStyles.tableHeaderText}>Montant</Text>
              </View>
              {chartData.weeklyData.map((week, index) => (
                <View key={index} style={dynamicStyles.tableRow}>
                  <Text style={dynamicStyles.tableCell}>{week.label}</Text>
                  <Text style={dynamicStyles.tableCell}>{formatAmount(week.total)}€</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={dynamicStyles.noData}>Aucune dépense pour ce mois</Text>
        )}
      </View>

      {/* DOUGHNUT CHART DES CATÉGORIES */}
      <View style={dynamicStyles.chartCard}>
        <Text style={dynamicStyles.chartTitle}>
          📊 Répartition par catégorie
        </Text>
        {chartData.categoryData.length > 0 ? (
          <>
            <View style={styles.pieChartContainer}>
              <PieChart
                data={chartData.categoryData}
                width={screenWidth - 80}
                height={200}
                chartConfig={pieChartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="50"
                absolute
                hasLegend={false}
              />
              {/* Overlay pour créer l'effet doughnut */}
              <View style={styles.doughnutCenter}>
                <View style={[styles.doughnutHole, { backgroundColor: colors.card }]} />
              </View>
              {/* Texte au centre */}
              <View style={dynamicStyles.centerTextContainer}>
                <Text style={dynamicStyles.centerText}>Total</Text>
                <Text style={dynamicStyles.centerSubText}>{formatAmount(categoryTotal)}€</Text>
              </View>
            </View>

            <View style={styles.categoryLegend}>
              {chartData.categoryData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={dynamicStyles.legendText}>
                    {item.name}: {formatAmount(item.amount)}€ ({getPercentage(item.amount, categoryTotal)})
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={dynamicStyles.noData}>Aucune dépense catégorisée ce mois</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  monthSelector: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    width: '60%' 
  },
  monthInfo: { 
    alignItems: 'center' 
  },
  chartContainer: { 
    alignItems: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 10,
    marginLeft: 15,
    position: 'relative',
  },
  chart: { 
    borderRadius: 16,
    marginVertical: 10,
  },
  weeksTable: {
    width: '100%',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryLegend: { 
    width: '100%', 
    marginTop: 20, 
    alignItems: 'center' 
  },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12, 
    justifyContent: 'center', 
    width: '100%' 
  },
  colorDot: { 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  doughnutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  doughnutHole: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
  },
});