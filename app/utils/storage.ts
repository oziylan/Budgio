import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync("budgio_v3.db");

const CATEGORY_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
  '#F9E79F', '#ABEBC6', '#EDBB99', '#AED6F1', '#FAD7A0'
];

export const initDatabase = async (): Promise<void> => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        category TEXT DEFAULT 'Divers',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS monthly_budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        budget_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'expense',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    //initialiser les catégories "Divers" pour dépenses ET revenus
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (name, color, type) VALUES (?, ?, ?)`,
      ['Divers', '#9E9E9E', 'expense']
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (name, color, type) VALUES (?, ?, ?)`,
      ['Divers', '#9E9E9E', 'income']
    );
    
    console.log("✅ Base de données initialisée");
  } catch (error) {
    console.error("❌ Erreur initialisation DB:", error);
    throw error;
  }
};

export const addCategory = async (
  name: string, 
  type: 'income' | 'expense' = 'expense'
): Promise<void> => {
  try {
    //verifi la limite de 20 catégories PAR TYPE (hors "Divers")
    const existingCategories = await getCategories(type);
    const currentCount = existingCategories.filter(cat => cat.name !== 'Divers').length;
    
    if (currentCount >= 20) {
      throw new Error(`Limite de 20 catégories ${type === 'income' ? 'de revenus' : 'de dépenses'} atteinte. Supprimez des catégories existantes pour en ajouter de nouvelles.`);
    }

    //trouver une couleur disponible (réutiliser les couleurs des catégories supprimées)
    const usedColors = existingCategories.map(cat => cat.color);
    const availableColor = CATEGORY_COLORS.find(color => !usedColors.includes(color)) 
      || CATEGORY_COLORS[currentCount % CATEGORY_COLORS.length];

    await db.runAsync(
      "INSERT OR IGNORE INTO categories (name, color, type) VALUES (?, ?, ?)",
      [name, availableColor, type]
    );
    console.log("✅ Catégorie ajoutée:", name, availableColor);
  } catch (error) {
    console.error("❌ Erreur ajout catégorie:", error);
    throw error;
  }
};

export const getCategories = async (type?: 'income' | 'expense'): Promise<any[]> => {
  try {
    let query = "SELECT * FROM categories";
    const params = [];
    
    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }
    
    query += " ORDER BY name ASC";
    
    const categories = await db.getAllAsync<any>(query, params);
    return categories;
  } catch (error) {
    console.error("❌ Erreur chargement catégories:", error);
    return [];
  }
};

export const getMonthlyBudget = async (year: number, month: number): Promise<number> => {
  try {
    const budgets = await db.getAllAsync<any>(
      "SELECT budget_amount FROM monthly_budgets WHERE year = ? AND month = ?",
      [year, month]
    );
    return budgets[0]?.budget_amount || 2000;
  } catch (error) {
    console.error("❌ Erreur récupération budget:", error);
    return 2000;
  }
};

export const setMonthlyBudget = async (year: number, month: number, budget: number): Promise<void> => {
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO monthly_budgets (year, month, budget_amount) 
       VALUES (?, ?, ?)`,
      [year, month, budget]
    );
    console.log("✅ Budget défini:", { year, month, budget });
  } catch (error) {
    console.error("❌ Erreur définition budget:", error);
    throw error;
  }
};

export const addTransaction = async (
  title: string, 
  amount: number, 
  type: string,
  date: string,
  payment_method: string,
  category: string = 'Divers'
): Promise<void> => {
  try {
    await db.runAsync(
      "INSERT INTO transactions (title, amount, type, date, payment_method, category) VALUES (?, ?, ?, ?, ?, ?)",
      [title, amount, type, date, payment_method, category]
    );
    console.log("✅ Transaction ajoutée");
  } catch (error) {
    console.error("❌ Erreur ajout transaction:", error);
    throw error;
  }
};

export const getTransactions = async (): Promise<any[]> => {
  try {
    const transactions = await db.getAllAsync<any>(
      "SELECT * FROM transactions ORDER BY created_at DESC"
    );
    return transactions;
  } catch (error) {
    console.error("❌ Erreur chargement transactions:", error);
    return [];
  }
};

export const getTransactionById = async (id: number): Promise<any> => {
  try {
    const transactions = await db.getAllAsync<any>(
      "SELECT * FROM transactions WHERE id = ?",
      [id]
    );
    return transactions[0] || null;
  } catch (error) {
    console.error("❌ Erreur chargement transaction:", error);
    return null;
  }
};

export const updateTransaction = async (
  id: number,
  title: string, 
  amount: number, 
  type: string,
  date: string,
  payment_method: string,
  category: string = 'Divers'
): Promise<void> => {
  try {
    await db.runAsync(
      "UPDATE transactions SET title = ?, amount = ?, type = ?, date = ?, payment_method = ?, category = ? WHERE id = ?",
      [title, amount, type, date, payment_method, category, id]
    );
    console.log("✅ Transaction mise à jour");
  } catch (error) {
    console.error("❌ Erreur mise à jour transaction:", error);
    throw error;
  }
};

export const deleteTransaction = async (id: number): Promise<void> => {
  try {
    await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
    console.log("🗑️ Transaction supprimée");
  } catch (error) {
    console.error("❌ Erreur suppression transaction:", error);
    throw error;
  }
};

export const getMonthlyStats = async (year: number, month: number): Promise<{
  totalIncome: number;
  totalExpenses: number;
}> => {
  try {
    const monthFormatted = month.toString().padStart(2, '0');
    const stats = await db.getAllAsync<any>(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses
       FROM transactions 
       WHERE strftime('%Y', date) = ? AND strftime('%m', date) = ?`,
      [year.toString(), monthFormatted]
    );
    
    const totalIncome = parseFloat((stats[0]?.totalIncome || 0).toFixed(2));
    const totalExpenses = parseFloat((stats[0]?.totalExpenses || 0).toFixed(2));
    
    return {
      totalIncome,
      totalExpenses
    };
  } catch (error) {
    console.error("❌ Erreur stats mensuelles:", error);
    return { totalIncome: 0, totalExpenses: 0 };
  }
};

export const deleteCategory = async (categoryName: string, type: 'income' | 'expense'): Promise<void> => {
  try {
    // Ne pas permettre la suppression de "Divers"
    if (categoryName === 'Divers') {
      throw new Error('Impossible de supprimer la catégorie "Divers"');
    }

    // 1. Mettre à jour toutes les transactions avec cette catégorie vers "Divers"
    await db.runAsync(
      "UPDATE transactions SET category = 'Divers' WHERE category = ? AND type = ?",
      [categoryName, type]
    );

    // 2. Supprimer la catégorie
    await db.runAsync(
      "DELETE FROM categories WHERE name = ? AND type = ?",
      [categoryName, type]
    );

    console.log("🗑️ Catégorie supprimée:", categoryName);
  } catch (error) {
    console.error("❌ Erreur suppression catégorie:", error);
    throw error;
  }
};

export const getAllCategories = async (): Promise<any[]> => {
  try {
    const categories = await db.getAllAsync<any>(
      "SELECT * FROM categories ORDER BY type, name ASC"
    );
    return categories;
  } catch (error) {
    console.error("❌ Erreur chargement toutes catégories:", error);
    return [];
  }
};
  export const updateCategory = async (id: number, newName: string): Promise<void> => {
    try {
      await db.runAsync(
        "UPDATE categories SET name = ? WHERE id = ?",
        [newName, id]
      );
      console.log("✅ Catégorie mise à jour:", id, newName);
    } catch (error) {
      console.error("❌ Erreur mise à jour catégorie:", error);
      throw error;
    }
  };

export const getCategoryStats = async (year: number, month: number): Promise<any[]> => {
  try {
    const monthFormatted = month.toString().padStart(2, '0');
    const stats = await db.getAllAsync<any>(
      `SELECT 
        category,
        SUM(amount) as total,
        COUNT(*) as count
       FROM transactions 
       WHERE type = 'expense' 
         AND strftime('%Y', date) = ? 
         AND strftime('%m', date) = ?
       GROUP BY category
       ORDER BY total DESC`,
      [year.toString(), monthFormatted]
    );
    return stats;
  } catch (error) {
    console.error("❌ Erreur stats catégories:", error);
    return [];
  }
  
};