import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Colors, FixedColors } from '../../constants/theme';
import { addCategory, deleteCategory, getAllCategories, initDatabase, updateCategory } from '../utils/storage';

export default function CategoriesManagementScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const router = useRouter();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isDarkMode = colorScheme === 'dark';

  const loadCategories = async () => {
    await initDatabase();
    const cats = await getAllCategories();
    // FILTRER : Ne pas afficher la catégorie "Divers"
    const filteredCats = cats.filter(cat => cat.name !== 'Divers');
    setCategories(filteredCats);
  };

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de catégorie');
      return;
    }

    try {
      await addCategory(newCategoryName.trim(), selectedType);
      await loadCategories();
      setNewCategoryName('');
      setShowAddModal(false);
      Alert.alert('Succès', 'Catégorie ajoutée avec succès');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter la catégorie');
    }
  };

  const handleEditCategory = async () => {
    if (!editCategoryName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de catégorie');
      return;
    }

    try {
      await updateCategory(editingCategory.id, editCategoryName.trim());
      await loadCategories();
      setEditCategoryName('');
      setShowEditModal(false);
      setEditingCategory(null);
      Alert.alert('Succès', 'Catégorie modifiée avec succès');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de modifier la catégorie');
    }
  };

  const handleDeleteCategory = (category: any) => {
    Alert.alert(
      "Supprimer la catégorie",
      `Êtes-vous sûr de vouloir supprimer "${category.name}" ?\n\nLes transactions associées seront déplacées vers "Divers".`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(category.name, category.type);
              await loadCategories();
              Alert.alert("Succès", `Catégorie "${category.name}" supprimée. Les transactions ont été déplacées vers "Divers".`);
            } catch (error: any) {
              Alert.alert("Erreur", error.message || 'Impossible de supprimer la catégorie');
            }
          }
        }
      ]
    );
  };

  const startEditing = (category: any) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setShowEditModal(true);
  };

  const getTypeLabel = (type: string) => {
    return type === 'income' ? 'Revenus' : 'Dépenses';
  };

  const getTypeColor = (type: string) => {
    return type === 'income' ? FixedColors.positive : FixedColors.negative;
  };

  // Compte uniquement les catégories personnalisées (sans "Divers")
  const getCategoriesCountByType = (type: string) => {
    return categories.filter(cat => cat.type === type).length;
  };

  const isLimitReached = (type: string) => {
    return getCategoriesCountByType(type) >= 20;
  };

  // Styles dynamiques basés sur le mode
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      alignItems: 'center',
      marginBottom: 10,
      backgroundColor: colors.card,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    // Nouveau style pour la carte
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Gestion des Catégories</Text>
      </View>

      {/* Carte pour le bouton d'ajout et les statistiques */}
      <View style={dynamicStyles.formCard}>
        {/* Bouton d'ajout */}
        <TouchableOpacity 
          style={[styles.addButton, { 
            backgroundColor: colors.card,
            borderColor: FixedColors.brandBlue
          }]}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={[styles.addButtonText, { color: FixedColors.brandBlue }]}>
            + Nouvelle Catégorie
          </Text>
        </TouchableOpacity>

        {/* Statistiques avec limites - COMPTE UNIQUEMENT LES CATÉGORIES PERSONNALISÉES */}
        <View style={styles.statsContainer}>
          <View style={[
            styles.statItem, 
            { backgroundColor: colors.background },
            isLimitReached('expense') && styles.statItemLimitReached
          ]}>
            <Text style={[
              styles.statNumber,
              { color: colors.text },
              isLimitReached('expense') && styles.statNumberLimitReached
            ]}>
              {getCategoriesCountByType('expense')}/20
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Catégories de dépenses
            </Text>
            {isLimitReached('expense') && (
              <Text style={styles.limitWarning}>Limite atteinte</Text>
            )}
          </View>
          <View style={[
            styles.statItem,
            { backgroundColor: colors.background },
            isLimitReached('income') && styles.statItemLimitReached
          ]}>
            <Text style={[
              styles.statNumber,
              { color: colors.text },
              isLimitReached('income') && styles.statNumberLimitReached
            ]}>
              {getCategoriesCountByType('income')}/20
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Catégories de revenus
            </Text>
            {isLimitReached('income') && (
              <Text style={styles.limitWarning}>Limite atteinte</Text>
            )}
          </View>
        </View>
      </View>

      {/* Liste des catégories - SANS "Divers" */}
      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <View style={[
            styles.categoryItem, 
            { 
              backgroundColor: colors.card,
              borderLeftColor: item.color
            }
          ]}>
            <View style={styles.categoryInfo}>
              <Text style={[styles.categoryName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[
                styles.categoryType, 
                { 
                  color: item.type === 'income' ? FixedColors.positive : FixedColors.negative 
                }
              ]}>
                {getTypeLabel(item.type)}
              </Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: FixedColors.brandBlue }]}
                onPress={() => startEditing(item)}
              >
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteCategory(item)}
              >
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        style={styles.categoriesList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune catégorie personnalisée
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Créez votre première catégorie en appuyant sur "+ Nouvelle Catégorie"
            </Text>
          </View>
        }
      />

      {/* Modal d'ajout */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            backgroundColor: colors.card,
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nouvelle Catégorie
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={[styles.closeButtonText, { color: colors.text }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Type de catégorie
            </Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity 
                style={[
                  styles.typeButton,
                  { backgroundColor: colors.card },
                  selectedType === 'expense' && styles.typeButtonSelected,
                  isLimitReached('expense') && styles.typeButtonDisabled
                ]}
                onPress={() => !isLimitReached('expense') && setSelectedType('expense')}
                disabled={isLimitReached('expense')}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  selectedType === 'expense' && styles.typeButtonTextSelected,
                  isLimitReached('expense') && styles.typeButtonTextDisabled
                ]}>
                  Dépenses {isLimitReached('expense') && '(Plein)'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeButton,
                  { backgroundColor: colors.card },
                  selectedType === 'income' && styles.typeButtonSelected,
                  isLimitReached('income') && styles.typeButtonDisabled
                ]}
                onPress={() => !isLimitReached('income') && setSelectedType('income')}
                disabled={isLimitReached('income')}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: colors.text },
                  selectedType === 'income' && styles.typeButtonTextSelected,
                  isLimitReached('income') && styles.typeButtonTextDisabled
                ]}>
                  Revenus {isLimitReached('income') && '(Plein)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Avertissement de limite */}
            {(isLimitReached('expense') || isLimitReached('income')) && (
              <View style={[styles.limitAlert, { 
                backgroundColor: isDarkMode ? '#3E2723' : '#FFF3CD',
              }]}>
                <Text style={[styles.limitAlertText, { 
                  color: isDarkMode ? '#D4AF37' : '#856404' 
                }]}>
                  {isLimitReached(selectedType) 
                    ? `Limite de 20 catégories ${selectedType === 'income' ? 'de revenus' : 'de dépenses'} atteinte. Supprimez des catégories pour en ajouter.`
                    : 'Une des catégories a atteint sa limite de 20.'
                  }
                </Text>
              </View>
            )}

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Nom de la catégorie
            </Text>
            <TextInput
              placeholder="Ex: Transport, Loisirs, Salaire..."
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              style={[styles.modalInput, { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }]}
              autoFocus
              editable={!isLimitReached(selectedType)}
              placeholderTextColor={colors.placeholder}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelModalButton, { backgroundColor: '#666' }]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveModalButton,
                  { backgroundColor: FixedColors.brandBlue },
                  (!newCategoryName.trim() || isLimitReached(selectedType)) && styles.saveModalButtonDisabled
                ]}
                onPress={handleAddCategory}
                disabled={!newCategoryName.trim() || isLimitReached(selectedType)}
              >
                <Text style={styles.saveModalButtonText}>
                  {isLimitReached(selectedType) ? 'Limite atteinte' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de modification */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { 
            backgroundColor: colors.card,
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Modifier la Catégorie
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditCategoryName('');
                  setEditingCategory(null);
                }}
              >
                <Text style={[styles.closeButtonText, { color: colors.text }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Type de catégorie
            </Text>
            {/* CORRECTION : Utilisation de brandBlue indépendamment du thème */}
            <View style={[styles.typeInfo, { backgroundColor: FixedColors.brandBlue }]}>
              <Text style={[styles.typeInfoText, { color: 'white' }]}>
                {editingCategory ? getTypeLabel(editingCategory.type) : ''}
              </Text>
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Nom de la catégorie
            </Text>
            <TextInput
              placeholder="Nouveau nom de la catégorie..."
              value={editCategoryName}
              onChangeText={setEditCategoryName}
              style={[styles.modalInput, { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }]}
              autoFocus
              placeholderTextColor={colors.placeholder}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelModalButton, { backgroundColor: '#666' }]}
                onPress={() => {
                  setShowEditModal(false);
                  setEditCategoryName('');
                  setEditingCategory(null);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveModalButton,
                  { backgroundColor: FixedColors.brandBlue },
                  (!editCategoryName.trim()) && styles.saveModalButtonDisabled
                ]}
                onPress={handleEditCategory}
                disabled={!editCategoryName.trim()}
              >
                <Text style={styles.saveModalButtonText}>
                  Modifier
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statItemLimitReached: {
    backgroundColor: '#FFF3CD',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statNumberLimitReached: {
    color: '#FF6B6B',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  limitWarning: {
    fontSize: 10,
    color: '#F44336',
    fontWeight: 'bold',
    marginTop: 4,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryType: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoriesList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  typeButtons: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#2196F3',
  },
  typeButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  typeButtonTextDisabled: {
    color: '#9E9E9E',
  },
  typeInfo: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  typeInfoText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  limitAlert: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  limitAlertText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveModalButtonDisabled: {
    backgroundColor: '#666',
  },
  saveModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});