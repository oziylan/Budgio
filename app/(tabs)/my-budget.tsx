import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Colors, FixedColors } from '../../constants/theme';
import { getMonthlyBudget, getMonthlyStats, initDatabase, setMonthlyBudget } from '../utils/storage';

export default function MonthlyScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0
  });
  const [monthlyBudget, setMonthlyBudgetState] = useState(2000);
  const [showBudgetInput, setShowBudgetInput] = useState(false);
  const [newBudget, setNewBudget] = useState('');

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const loadMonthlyData = async () => {
    await initDatabase();
    const stats = await getMonthlyStats(currentYear, currentMonth + 1);
    
    const balance = parseFloat((stats.totalIncome - stats.totalExpenses).toFixed(2));
    
    const savedBudget = await getMonthlyBudget(currentYear, currentMonth + 1);
    setMonthlyBudgetState(savedBudget);
    
    setMonthlyData({
      totalIncome: stats.totalIncome,
      totalExpenses: stats.totalExpenses,
      balance
    });
  };

  useFocusEffect(
    useCallback(() => {
      loadMonthlyData();
    }, [currentDate])
  );

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const handleSetBudget = () => {
    setNewBudget(monthlyBudget.toFixed(2).replace('.', ','));
    setShowBudgetInput(true);
  };

  const handleSaveBudget = async () => {
    const budgetValueStr = newBudget.replace(',', '.');
    const budgetValue = parseFloat(budgetValueStr);
    
    if (!isNaN(budgetValue) && budgetValue > 0) {
      await setMonthlyBudget(currentYear, currentMonth + 1, budgetValue);
      setMonthlyBudgetState(budgetValue);
      setShowBudgetInput(false);
    } else {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide (ex: 1500,75)');
    }
  };

  const handleCancelBudget = () => {
    setShowBudgetInput(false);
    setNewBudget('');
  };

  const handleBudgetChange = (text: string) => {
    const cleanedText = text.replace(/[^\d,]/g, '');
    
    const parts = cleanedText.split(',');
    let formattedText = parts[0];
    if (parts.length > 1) {
      formattedText += ',' + parts.slice(1).join('').substring(0, 2);
    }
    
    setNewBudget(formattedText);
  };

  const budgetProgress = monthlyBudget > 0 ? (monthlyData.totalExpenses / monthlyBudget) * 100 : 0;
  const isOverBudget = monthlyData.totalExpenses > monthlyBudget;

  // Fonction pour créer les segments de la barre circulaire
  const renderCircularProgress = () => {
    const segments = 36; // 36 segments pour 360° (10° par segment)
    const progress = Math.min(budgetProgress, 100);
    const activeSegments = Math.floor((progress / 100) * segments);
    
    return (
      <View style={dynamicStyles.circularProgressContainer}>
        <View style={dynamicStyles.circularProgressBase}>
          {/* Segments de progression */}
          {Array.from({ length: segments }).map((_, index) => {
            const isActive = index < activeSegments;
            const rotation = (index * (360 / segments))
            
            return (
              <View
                key={index}
                style={[
                  dynamicStyles.progressSegment,
                  {
                    transform: [{ rotate: `${rotation}deg` }],
                    backgroundColor: isActive 
                      ? (isOverBudget ? FixedColors.negative : FixedColors.positive)
                      : (isDarkMode ? '#2D2D2D' : '#F0F0F0')
                  }
                ]}
              />
            );
          })}
          
          {/* Cercle intérieur pour masquer les extrémités des segments */}
          <View style={dynamicStyles.circularProgressInner} />
          
          {/* Texte au centre */}
          <View style={dynamicStyles.circularProgressTextContainer}>
            <Text style={dynamicStyles.circularProgressText}>
              {Math.round(progress)}%
            </Text>
            <Text style={dynamicStyles.circularProgressLabel}>
              utilisé
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Styles pour le solde (identique à index.tsx)
  const getBalanceStyles = () => {
    if (isDarkMode) {
      return monthlyData.balance >= 0 
        ? { backgroundColor: '#1B3B1B', borderColor: '#2E7D32' }
        : { backgroundColor: '#3B1B1B', borderColor: '#C62828' };
    } else {
      return monthlyData.balance >= 0 
        ? styles.positiveBalance 
        : styles.negativeBalance;
    }
  };

  // Styles dynamiques basés sur le mode
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Carte unique pour la sélection du mois ET le solde
    mainCard: {
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
    },
    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    monthButtonText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.tint,
    },
    monthTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    // SOLDE identique à index.tsx mais adapté pour la carte
    balanceContainer: {
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      width: '100%',
    },
    balanceLabel: {
      fontSize: 16,
      marginBottom: 4,
      color: colors.textSecondary,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
    },
    incomeText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    incomeAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: FixedColors.positive,
    },
    expenseText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    expenseAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: FixedColors.negative,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    budgetCard: {
      margin: 16,
      padding: 20,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 6,
      elevation: 3,
      alignItems: 'center',
    },
    budgetTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    editBudgetText: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: '500',
    },
    budgetAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
    },
    budgetInput: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      borderRadius: 8,
      fontSize: 18,
      marginBottom: 12,
      backgroundColor: colors.card,
      color: colors.text,
      width: '100%',
    },
    cancelButton: {
      backgroundColor: '#666',
      padding: 12,
      borderRadius: 8,
      flex: 1,
      marginRight: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: FixedColors.white,
      fontWeight: 'bold',
    },
    saveButton: {
      backgroundColor: FixedColors.brandBlue,
      padding: 12,
      borderRadius: 8,
      flex: 1,
      marginLeft: 8,
      alignItems: 'center',
    },
    saveButtonText: {
      color: FixedColors.white,
      fontWeight: 'bold',
    },
    circularProgressContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 20,
    },
    circularProgressBase: {
      width: 160,
      height: 160,
      borderRadius: 80,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    progressSegment: {
      position: 'absolute',
      width: 6,
      height: 80,
      top: 0,
      left: 77, // (160 - 6) / 2
      transformOrigin: 'bottom center',
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
    },
    circularProgressInner: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.card,
      position: 'absolute',
    },
    circularProgressTextContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    circularProgressText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    circularProgressLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'center',
    },
    progressDetails: {
      alignItems: 'center',
      marginTop: 16,
    },
    progressAmount: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    progressSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 4,
    },
    statItem: {
      flex: 1,
      minWidth: '45%',
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    alertCard: {
      margin: 16,
      padding: 16,
      backgroundColor: isDarkMode ? '#3D1F1F' : '#FFEBEE',
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: FixedColors.negative,
      borderWidth: 1,
      borderColor: colors.border,
    },
    alertText: {
      color: isDarkMode ? '#FF6B6B' : '#D32F2F',
      fontWeight: '500',
    },
  });

  return (
    <KeyboardAvoidingView 
      style={dynamicStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={dynamicStyles.container}>
        {/* Carte unique pour la sélection du mois ET le solde */}
        <View style={dynamicStyles.mainCard}>
          {/* Sélection du mois */}
          <View style={dynamicStyles.monthHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
              <Text style={dynamicStyles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            
            <Text style={dynamicStyles.monthTitle}>{getMonthName(currentDate)}</Text>
            
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
              <Text style={dynamicStyles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* SOLDE du mois */}
          <View style={[styles.balanceContainer, getBalanceStyles()]}>
            <Text style={dynamicStyles.balanceLabel}>Solde du mois</Text>
            <Text style={dynamicStyles.balanceAmount}>{formatAmount(monthlyData.balance)}€</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={dynamicStyles.incomeText}>Revenus</Text>
                <Text style={dynamicStyles.incomeAmount}>+{formatAmount(monthlyData.totalIncome)}€</Text>
              </View>
              
              <View style={[styles.statSeparator, { backgroundColor: colors.border }]} />
              
              <View style={styles.statItem}>
                <Text style={dynamicStyles.expenseText}>Dépenses</Text>
                <Text style={dynamicStyles.expenseAmount}>-{formatAmount(monthlyData.totalExpenses)}€</Text>
              </View>
            </View>

            <Text style={dynamicStyles.subtitle}>
              {monthlyData.totalIncome + monthlyData.totalExpenses > 0 ? 
                `${Math.round((monthlyData.totalIncome > 0 ? (monthlyData.totalExpenses / monthlyData.totalIncome) * 100 : 0))}% des revenus dépensés` : 
                'Aucune transaction'
              }
            </Text>
          </View>
        </View>

        <View style={dynamicStyles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={dynamicStyles.budgetTitle}>Budget mensuel</Text>
            <TouchableOpacity onPress={handleSetBudget}>
              <Text style={dynamicStyles.editBudgetText}>Modifier</Text>
            </TouchableOpacity>
          </View>
          
          {showBudgetInput ? (
            <View style={styles.budgetInputContainer}>
              <TextInput
                style={dynamicStyles.budgetInput}
                value={newBudget}
                onChangeText={handleBudgetChange}
                keyboardType="decimal-pad"
                placeholder="Ex: 1500,75"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
              <View style={styles.budgetButtons}>
                <TouchableOpacity style={dynamicStyles.cancelButton} onPress={handleCancelBudget}>
                  <Text style={dynamicStyles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={dynamicStyles.saveButton} onPress={handleSaveBudget}>
                  <Text style={dynamicStyles.saveButtonText}>Valider</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={dynamicStyles.budgetAmount}>{formatAmount(monthlyBudget)}€</Text>
              
              {/* BARRE DE PROGRESSION CIRCULAIRE AVEC SEGMENTS */}
              {renderCircularProgress()}
              
              {/* Détails sous la barre circulaire */}
              <View style={dynamicStyles.progressDetails}>
                <Text style={dynamicStyles.progressAmount}>
                  {formatAmount(monthlyData.totalExpenses)}€ / {formatAmount(monthlyBudget)}€
                </Text>
                <Text style={dynamicStyles.progressSubtext}>
                  {isOverBudget ? '⚠️ Budget dépassé' : 'Budget restant'}
                </Text>
                {isOverBudget && (
                  <Text style={[dynamicStyles.progressSubtext, { color: FixedColors.negative }]}>
                    Dépassement: {formatAmount(monthlyData.totalExpenses - monthlyBudget)}€
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statValue}>{formatAmount(monthlyData.totalIncome)}€</Text>
            <Text style={dynamicStyles.statLabel}>Revenus totaux</Text>
          </View>
          
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statValue}>{formatAmount(monthlyData.totalExpenses)}€</Text>
            <Text style={dynamicStyles.statLabel}>Dépenses totales</Text>
          </View>
          
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statValue}>
              {monthlyData.totalIncome > 0 
                ? Math.round((monthlyData.totalExpenses / monthlyData.totalIncome) * 100)
                : 0
              }%
            </Text>
            <Text style={dynamicStyles.statLabel}>Taux de dépenses</Text>
          </View>
          
          <View style={dynamicStyles.statItem}>
            <Text style={dynamicStyles.statValue}>
              {monthlyBudget > 0 
                ? Math.round(budgetProgress)
                : 0
              }%
            </Text>
            <Text style={dynamicStyles.statLabel}>Budget utilisé</Text>
          </View>
        </View>

        {isOverBudget && (
          <View style={dynamicStyles.alertCard}>
            <Text style={dynamicStyles.alertText}>⚠️ Attention ! Vous avez dépassé votre budget mensuel</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  monthButton: {
    padding: 10,
  },
  // STYLES FIXES POUR LE SOLDE (identique à index.tsx)
  balanceContainer: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  positiveBalance: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  negativeBalance: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statSeparator: {
    width: 1,
    marginHorizontal: 10,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  budgetInputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  budgetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: 16,
    gap: 12,
  },
});