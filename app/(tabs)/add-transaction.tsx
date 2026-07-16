import { Colors, FixedColors } from '@/constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { processTicketOCR } from '../utils/ocr-space';
import { addCategory, addTransaction, getCategories, initDatabase } from '../utils/storage';

export default function AddTransactionScreen() {
  const [isIncome, setIsIncome] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'electronic'>('electronic');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Divers');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const colors = Colors[isDarkMode ? 'dark' : 'light'];

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setDate(new Date());
    setPaymentMethod('electronic');
    setSelectedCategory('Divers');
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };



  useEffect(() => {
    loadCategories();
    // Réintiialiser le formulaire quand le composant est monté
    resetForm();
  }, [isIncome]);

  const loadCategories = async () => {
    await initDatabase();
    const cats = await getCategories(isIncome ? 'income' : 'expense');
    setCategories(cats);
  };

  const handleTypeChange = (income: boolean) => {
    setIsIncome(income);
    setSelectedCategory('Divers');
  };

  const handleAmountChange = (text: string) => {
    const cleanedText = text.replace(/[^\d,]/g, '');
    
    const parts = cleanedText.split(',');
    let formattedText = parts[0];
    if (parts.length > 1) {
      formattedText += ',' + parts.slice(1).join('').substring(0, 2);
    }
    
    const numberParts = formattedText.split(',');
    const integerPart = numberParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    
    if (numberParts.length > 1) {
      setAmount(integerPart + ',' + numberParts[1]);
    } else {
      setAmount(integerPart);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de catégorie');
      return;
    }

    try {
      await addCategory(newCategoryName.trim(), isIncome ? 'income' : 'expense');
      await loadCategories();
      setSelectedCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      Alert.alert('Succès', 'Catégorie ajoutée avec succès');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la catégorie');
    }
  };

  const handleCameraPress = async () => {
    if (isIncome) {
      Alert.alert('Information', 'La capture de ticket est disponible uniquement pour les dépenses');
      return;
    }

    if (isProcessingOCR) return;

    setIsProcessingOCR(true);

    try {
      const formData = await processTicketOCR();
      
      setTitle(formData.title);
      
      if (formData.amount > 0) {
        setAmount(formData.amount.toFixed(2).replace('.', ','));
      }
      
      setDate(new Date(formData.date));
      setPaymentMethod(formData.payment_method);
      
      Alert.alert(
        '✅ Ticket analysé avec succès', 
        'Les informations ont été pré-remplies. Vous pouvez les modifier avant enregistrement.'
      );
      
    } catch (error: any) {
      console.error('Erreur OCR détaillée:', error);
      
      let errorMessage = 'Impossible d\'analyser le ticket. ';
      
      if (error.message.includes('Temps d\'attente dépassé') || error.message.includes('Timeout')) {
        errorMessage += 'Le service met trop de temps à répondre. Vérifiez votre connexion internet.';
      } else if (error.message.includes('Permission caméra')) {
        errorMessage += 'L\'accès à la caméra est nécessaire. Autorisez l\'accès dans les paramètres de votre appareil.';
      } else if (error.message.includes('API key') || error.message.includes('quota')) {
        errorMessage += 'Problème avec le service d\'analyse. Veuillez réessayer plus tard.';
      } else {
        errorMessage += 'Veuillez saisir manuellement les informations.';
      }
      
      Alert.alert('❌ Analyse impossible', errorMessage);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !amount) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const cleanAmount = amount.replace(/\s/g, '').replace(',', '.');
    
    try {
      const formattedDate = date.toISOString().split('T')[0];
      
      await addTransaction(
        title,
        parseFloat(cleanAmount),
        isIncome ? 'income' : 'expense',
        formattedDate,
        paymentMethod,
        selectedCategory
      );

      Alert.alert(
        '✅ Succès !',
        `${isIncome ? 'Revenu' : 'Dépense'} enregistré`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              router.back();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('❌ Erreur', 'Impossible de sauvegarder la transaction');
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
      color: colors.text,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.text,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.text,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 16,
      borderRadius: 8,
      backgroundColor: colors.card,
      fontSize: 16,
      color: colors.text,
    },
    categoryButton: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    categoryButtonText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    paymentButton: {
      flex: 1,
      padding: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    paymentButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    typeButtonInactive: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    typeButtonTextInactive: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
    },
    newCategoryInput: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      borderRadius: 8,
      backgroundColor: colors.card,
      fontSize: 16,
      color: colors.text,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      width: '90%',
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryItemText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    loadingContainer: {
      marginTop: 16,
      padding: 14,
      backgroundColor: colors.card,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cameraButton: {
      position: 'absolute',
      bottom: 30,
      right: 30,
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: FixedColors.brandBlue,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 1000,
    },
    cameraText: {
      fontSize: 11,
      color: FixedColors.white,
      fontWeight: 'bold',
    },
    submitButton: {
      marginTop: 8,
      backgroundColor: FixedColors.brandBlue,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
    },
    submitButtonText: {
      color: FixedColors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
    typeCard: {
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
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        dynamicStyles.categoryItem,
        selectedCategory === item.name && styles.categoryItemSelected
      ]}
      onPress={() => {
        setSelectedCategory(item.name);
        setShowCategoryModal(false);
      }}
    >
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <Text style={[
        dynamicStyles.categoryItemText,
        selectedCategory === item.name && styles.categoryItemTextSelected
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={dynamicStyles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        enableAutomaticScroll={true}
      >
        <View style={styles.topSpacer} />
        
        {/* Première carte : Type de transaction */}
        <View style={dynamicStyles.typeCard}>
          <Text style={dynamicStyles.title}>
            {isIncome ? 'Nouveau Revenu' : 'Nouvelle Dépense'}
          </Text>

          <View style={styles.switchContainer}>
            <TouchableOpacity 
              style={[
                styles.typeButton,
                isIncome ? styles.incomeButtonActive : dynamicStyles.typeButtonInactive,
                isIncome && isDarkMode && styles.incomeButtonActiveDark,
                !isIncome && isDarkMode && styles.typeButtonInactiveDark
              ]}
              onPress={() => handleTypeChange(true)}
            >
              <Text style={[
                styles.typeButtonText,
                isIncome ? styles.incomeTextActive : dynamicStyles.typeButtonTextInactive,
                isIncome && isDarkMode && styles.typeButtonTextActiveDark
              ]}>
                Revenu
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.typeButton,
                !isIncome ? styles.expenseButtonActive : dynamicStyles.typeButtonInactive,
                !isIncome && isDarkMode && styles.expenseButtonActiveDark,
                isIncome && isDarkMode && styles.typeButtonInactiveDark
              ]}
              onPress={() => handleTypeChange(false)}
            >
              <Text style={[
                styles.typeButtonText,
                !isIncome ? styles.expenseTextActive : dynamicStyles.typeButtonTextInactive,
                !isIncome && isDarkMode && styles.typeButtonTextActiveDark
              ]}>
                Dépense
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Deuxième carte : Formulaire de détails */}
        <View style={dynamicStyles.formCard}>
          <TextInput
            placeholder="Titre (ex: Salaire, Courses, Essence...)"
            value={title}
            onChangeText={setTitle}
            style={dynamicStyles.input}
            returnKeyType="next"
            blurOnSubmit={false}
            placeholderTextColor={colors.placeholder}
          />

          <View style={styles.categorySection}>
            <Text style={dynamicStyles.sectionLabel}>Catégorie</Text>
            
            {!showNewCategoryInput ? (
              <View style={styles.categorySelector}>
                <TouchableOpacity 
                  style={dynamicStyles.categoryButton}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Text style={dynamicStyles.categoryButtonText}>
                    {selectedCategory}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addCategoryButton}
                  onPress={() => setShowNewCategoryInput(true)}
                >
                  <Text style={styles.addCategoryText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.newCategoryContainer}>
                <TextInput
                  placeholder="Nouvelle catégorie..."
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  style={dynamicStyles.newCategoryInput}
                  autoFocus
                  returnKeyType="done"
                  placeholderTextColor={colors.placeholder}
                />
                <View style={styles.newCategoryButtons}>
                  <TouchableOpacity 
                    style={styles.cancelCategoryButton}
                    onPress={() => {
                      setShowNewCategoryInput(false);
                      setNewCategoryName('');
                    }}
                  >
                    <Text style={styles.cancelCategoryText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveCategoryButton}
                    onPress={handleAddCategory}
                  >
                    <Text style={styles.saveCategoryText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.paymentSection}>
            <Text style={dynamicStyles.sectionLabel}>Type de paiement</Text>
            <View style={styles.paymentButtons}>
              <TouchableOpacity 
                style={[
                  dynamicStyles.paymentButton,
                  paymentMethod === 'cash' && styles.paymentButtonSelected
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Text style={[
                  dynamicStyles.paymentButtonText,
                  paymentMethod === 'cash' && styles.paymentButtonTextSelected
                ]}>
                  💵 Espèces
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  dynamicStyles.paymentButton,
                  paymentMethod === 'electronic' && styles.paymentButtonSelected
                ]}
                onPress={() => setPaymentMethod('electronic')}
              >
                <Text style={[
                  dynamicStyles.paymentButtonText,
                  paymentMethod === 'electronic' && styles.paymentButtonTextSelected
                ]}>
                  💳 Électronique
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.dateSection}>
            <Text style={dynamicStyles.label}>Date</Text>
            <View style={styles.dateButton}>
              <Button 
                title={date.toLocaleDateString('fr-FR')}
                onPress={() => setShowDatePicker(true)}
                color="#0a7ea4"
              />
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              locale="fr-FR"
            />
          )}
          
          <TextInput
            placeholder="Montant (ex: 9,99 ou 1 00 €)"
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            style={dynamicStyles.input}
            returnKeyType="done"
            placeholderTextColor={colors.placeholder}
          />
          
          <TouchableOpacity 
            style={dynamicStyles.submitButton}
            onPress={handleSubmit}
            disabled={isProcessingOCR}
          >
            <Text style={dynamicStyles.submitButtonText}>
              Ajouter {isIncome ? 'revenu' : 'dépense'}
            </Text>
          </TouchableOpacity>

          {isProcessingOCR && (
            <View style={dynamicStyles.loadingContainer}>
              <Text style={styles.loadingText}>📸 Analyse du ticket en cours...</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>

      {!isIncome && (
        <TouchableOpacity 
          style={[
            dynamicStyles.cameraButton,
            isProcessingOCR && styles.cameraButtonDisabled
          ]}
          onPress={handleCameraPress}
          disabled={isProcessingOCR}
        >
          <Text style={styles.cameraIcon}>
            {isProcessingOCR ? '⏳' : '📸'}
          </Text>
          <Text style={dynamicStyles.cameraText}>OCR</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Choisir une catégorie</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={categories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.categoryList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  topSpacer: {
    height: 20,
  },
  bottomSpacer: {
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  typeButtonInactiveDark: {
    backgroundColor: '#2D3243',
    borderColor: '#333333',
  },
  incomeButtonActive: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  expenseButtonActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  incomeButtonActiveDark: {
    backgroundColor: '#1B3B1B',
    borderColor: '#4CAF50',
  },
  expenseButtonActiveDark: {
    backgroundColor: '#3B1B1B',
    borderColor: '#F44336',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  incomeTextActive: {
    color: '#2E7D32',
  },
  expenseTextActive: {
    color: '#C62828',
  },
  typeButtonTextActiveDark: {
    color: FixedColors.white,
  },
  categorySection: {
    marginBottom: 16,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666',
  },
  addCategoryButton: {
    width: 45,
    height: 45,
    backgroundColor: FixedColors.brandBlue,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCategoryText: {
    color: FixedColors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  newCategoryContainer: {
    gap: 8,
  },
  newCategoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelCategoryButton: {
    flex: 1,
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelCategoryText: {
    color: FixedColors.white,
    fontWeight: '600',
  },
  saveCategoryButton: {
    flex: 1,
    backgroundColor: FixedColors.brandBlue,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveCategoryText: {
    color: FixedColors.white,
    fontWeight: '600',
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentButtonSelected: {
    backgroundColor: FixedColors.brandBlue,
  },
  paymentButtonTextSelected: {
    color: FixedColors.white,
    fontWeight: '600',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateButton: {
    borderWidth: 2,
    borderColor: '#0a7ea4',
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingText: {
    color: '#666',
    fontWeight: '500',
  },
  cameraButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  cameraIcon: {
    fontSize: 20,
    color: FixedColors.white,
    marginBottom: 2,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItemSelected: {
    backgroundColor: FixedColors.brandBlue,
    borderRadius: 8,
  },
  categoryItemTextSelected: {
    color: FixedColors.white,
    fontWeight: '600',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
});