import { FixedColors } from "@/constants/theme";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { deleteTransaction, getCategories, getTransactions, initDatabase } from '../utils/storage';

export default function HomeScreen() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balance, setBalance] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const loadUserName = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      if (name) {
        setUserName(name);
      }
    } catch (error) {
      console.error('Erreur chargement nom utilisateur:', error);
    }
  };

  const loadTransactions = async () => {
    await initDatabase();
    const data = await getTransactions();
    
    //trier les transactions par date (du plus récent au plus ancien)
    const sortedTransactions = data.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    setTransactions(sortedTransactions);
    setFilteredTransactions(sortedTransactions);
    
    //charger les catégories pour avoir les couleurs
    const expenseCats = await getCategories('expense');
    const incomeCats = await getCategories('income');
    setCategories([...expenseCats, ...incomeCats]);
    
    //Calcul précis avec 2 décimales
    const income = data
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = data
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Arrondir à 2 décimales
    const roundedIncome = parseFloat(income.toFixed(2));
    const roundedExpenses = parseFloat(expenses.toFixed(2));
    const roundedBalance = parseFloat((roundedIncome - roundedExpenses).toFixed(2));
    
    setTotalIncome(roundedIncome);
    setTotalExpenses(roundedExpenses);
    setBalance(roundedBalance);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(transaction =>
        transaction.title.toLowerCase().includes(query.toLowerCase()) ||
        transaction.category?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTransactions(filtered);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserName();
      loadTransactions();
    }, [])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const getPaymentIcon = (method: string) => {
    return method === 'cash' ? '💵' : '💳';
  };

  const getCategoryColor = (categoryName: string, type: 'income' | 'expense') => {
    const category = categories.find(cat => 
      cat.name === categoryName && cat.type === type
    );
    return category?.color || '#9E9E9E'; // Gris par défaut
  };

  const handleEdit = (transaction: any) => {
    router.push({
      pathname: "/edit-transaction",
      params: { 
        id: transaction.id,
        title: transaction.title,
        amount: transaction.amount.toString(),
        type: transaction.type,
        date: transaction.date,
        payment_method: transaction.payment_method,
        category: transaction.category
      }
    });
  };

  const handleDelete = (transaction: any) => {
    Alert.alert(
      "Supprimer la transaction",
      `Êtes-vous sûr de vouloir supprimer "${transaction.title}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              await loadTransactions();
              Alert.alert("Succès", "Transaction supprimée");
            } catch (error) {
              Alert.alert("Erreur", "Impossible de supprimer la transaction");
            }
          }
        }
      ]
    );
  };

  // Styles dynamiques basés sur le mode
  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    },
    header: { 
      alignItems: 'center', 
      padding: 20,
      backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
      marginBottom: 10,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginBottom: 16,
      width: '100%',
    },
    logo: {
      width: 50,
      height: 50,
      marginRight: 12,
      resizeMode: 'contain',
    },
    titleTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: { 
      fontSize: 24, 
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontFamily: 'System',
      letterSpacing: 0.5,
    },
    userName: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginLeft: 4,
    },
    subtitle: { 
      fontSize: 14, 
      color: isDarkMode ? '#CCCCCC' : '#666',
      textAlign: 'center',
      marginTop: 8,
      fontWeight: '500',
    },
    incomeText: {
      fontSize: 14,
      color: isDarkMode ? '#CCCCCC' : '#666',
      marginBottom: 4,
      fontWeight: '500',
    },
    incomeAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#4CAF50',
    },
    expenseText: {
      fontSize: 14,
      color: isDarkMode ? '#CCCCCC' : '#666',
      marginBottom: 4,
      fontWeight: '500',
    },
    expenseAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#F44336',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      marginTop: 50,
      backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
      margin: 20,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    emptyText: {
      fontSize: 18,
      color: isDarkMode ? '#FFFFFF' : '#666',
      marginBottom: 8,
      fontWeight: '500',
    },
    emptySubtext: {
      fontSize: 14,
      color: isDarkMode ? '#CCCCCC' : '#999',
      textAlign: 'center',
    },
    transaction: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
      padding: 16,
      marginHorizontal: 10,
      marginBottom: 8,
      borderRadius: 16,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    transactionTitle: { 
      fontSize: 16, 
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#333',
      marginBottom: 8,
    },
    transactionDate: { 
      fontSize: 14, 
      color: isDarkMode ? '#CCCCCC' : '#666',
      fontWeight: '400',
    },
    paymentMethod: {
      fontSize: 12,
      color: isDarkMode ? '#CCCCCC' : '#888',
      backgroundColor: isDarkMode ? '#2D2D2D' : '#f0f0f0',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      fontWeight: '500',
    },
    transactionType: {
      fontSize: 12,
      color: isDarkMode ? '#999999' : '#999',
      textTransform: 'uppercase',
      marginBottom: 8,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    searchContainer: {
      backgroundColor: isDarkMode ? '#1E1E1E' : 'white',
      padding: 16,
      marginHorizontal: 10,
      marginBottom: 16,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    searchInput: {
      backgroundColor: isDarkMode ? '#2D2D2D' : '#f5f5f5',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#333',
      borderWidth: 1,
      borderColor: isDarkMode ? '#444' : '#e0e0e0',
    },
  });

  const getBalanceStyles = () => {
    if (isDarkMode) {
      return balance >= 0 
        ? { 
            backgroundColor: '#1B3B1B', 
            borderColor: '#2E7D32',
            shadowColor: '#4CAF50'
          }
        : { 
            backgroundColor: '#3B1B1B', 
            borderColor: '#C62828',
            shadowColor: '#F44336'
          };
    } else {
      return balance >= 0 
        ? styles.positiveBalance 
        : styles.negativeBalance;
    }
  };

  return (
    <KeyboardAwareScrollView 
      style={dynamicStyles.container}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
    >
      <View style={dynamicStyles.header}>
        {/* Logo centré */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 10 }}>
          <Image 
            source={require("../../assets/images/budgio_logo_2.png")}
            style={dynamicStyles.logo}
          />
        </View>

        {/* Sous-titre si aucun nom d'utilisateur */}
        {!userName && (
          <Text style={dynamicStyles.subtitle}>Gestionnaire de budget</Text>
        )}

        {/* Solde */}
        <View style={[
          styles.balanceContainer,
          getBalanceStyles()
        ]}>
          <Text style={[
            styles.balanceLabel,
            { color: isDarkMode ? '#FFFFFF' : '#666' }
          ]}>
            Solde de {userName}
          </Text>
          <Text style={[
            styles.balanceAmount,
            { color: isDarkMode ? '#FFFFFF' : '#333' }
          ]}>
            {formatAmount(balance)}€
          </Text>
        </View>

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={dynamicStyles.incomeText}>Revenus</Text>
            <Text style={dynamicStyles.incomeAmount}>+{formatAmount(totalIncome)}€</Text>
          </View>
          
          <View style={[styles.statSeparator, { backgroundColor: isDarkMode ? '#333' : '#ddd' }]} />
          
          <View style={styles.statItem}>
            <Text style={dynamicStyles.expenseText}>Dépenses</Text>
            <Text style={dynamicStyles.expenseAmount}>-{formatAmount(totalExpenses)}€</Text>
          </View>
        </View>

        {/* Nombre de transactions */}
        <Text style={dynamicStyles.subtitle}>
          {transactions.length} transaction{transactions.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Barre de recherche */}
      <View style={dynamicStyles.searchContainer}>
        <TextInput
          style={dynamicStyles.searchInput}
          placeholder="Rechercher une transaction..."
          placeholderTextColor={isDarkMode ? '#999' : '#888'}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Liste ou état vide */}
      {filteredTransactions.length === 0 ? (
        <View style={dynamicStyles.emptyState}>
          <Text style={dynamicStyles.emptyText}>
            {searchQuery ? 'Aucun résultat trouvé' : 'Aucune transaction'}
          </Text>
          <Text style={dynamicStyles.emptySubtext}>
            {searchQuery ? 'Essayez avec d\'autres termes' : 'Ajoutez votre première transaction'}
          </Text>
        </View>
      ) : (
        filteredTransactions.map((transaction) => (
          <View key={transaction.id} style={[
            dynamicStyles.transaction,
            transaction.type === 'income' ? styles.incomeBorder : styles.expenseBorder
          ]}>
            <View style={styles.transactionLeft}>
              <Text style={dynamicStyles.transactionTitle}>{transaction.title}</Text>
              
              <View style={[
                styles.categoryBadge,
                { 
                  backgroundColor: getCategoryColor(
                    transaction.category || 'Divers', 
                    transaction.type as 'income' | 'expense'
                  ) 
                }
              ]}>
                <Text style={styles.categoryText}>
                  {transaction.category || 'Divers'}
                </Text>
              </View>
              
              <View style={styles.transactionDetails}>
                <Text style={dynamicStyles.transactionDate}>
                  {formatDate(transaction.date)}
                </Text>
                <Text style={dynamicStyles.paymentMethod}>
                  {getPaymentIcon(transaction.payment_method)} {transaction.payment_method === 'cash' ? 'Espèces' : 'Électronique'}
                </Text>
              </View>
            </View>
            
            <View style={styles.transactionRight}>
              <Text style={[
                styles.transactionAmount,
                transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
              ]}>
                {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}€
              </Text>
              <Text style={dynamicStyles.transactionType}>
                {transaction.type === 'income' ? 'Revenu' : 'Dépense'}
              </Text>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEdit(transaction)}
                >
                  <Text style={styles.editButtonText}>Modifier</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => handleDelete(transaction)}
                >
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}
    </KeyboardAwareScrollView>
  );

}

const styles = StyleSheet.create({
  balanceContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    width: '100%',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  positiveBalance: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  negativeBalance: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    shadowColor: '#F44336',
  },
  balanceLabel: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
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
  incomeBorder: {
    borderLeftColor: '#4CAF50',
  },
  expenseBorder: {
    borderLeftColor: '#F44336',
  },
  transactionLeft: {
    flex: 1,
    marginRight: 10,
  },
  transactionRight: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionAmount: { 
    fontSize: 16, 
    fontWeight: 'bold',
    marginBottom: 4,
  },
  incomeAmount: {
    color: '#4CAF50',
  },
  expenseAmount: {
    color: '#F44336',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: FixedColors.brandBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});