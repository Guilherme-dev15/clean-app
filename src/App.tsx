/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import type { Firestore, DocumentData } from 'firebase/firestore'; // Importa DocumentData

// =====================================================================
// INTERFACES PARA TIPAGEM
// =====================================================================
interface Product {
    id?: string;
    name: string;
    price: number;
    costPrice: number;
    stock: number;
    minStock: number;
    category: string;
    lastUpdated?: string;
}

interface Expense {
    id?: string;
    description: string;
    amount: number;
    timestamp?: string;
}

interface Attachment {
    url: string;
    description: string;
}

interface Client {
    id?: string;
    name: string;
    documentType: 'CPF' | 'CNPJ';
    documentNumber: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    invoicingNotes: Attachment[];
    lastUpdated?: string;
}

interface CartItem extends Product {
    quantity: number;
}

interface SaleItem {
    productId: string;
    name: string;
    price: number;
    costPrice: number;
    quantity: number;
}

interface Sale {
    id?: string;
    timestamp: string;
    items: SaleItem[];
    total: number;
    paymentMethod: string;
    userId: string;
    clientId: string | null;
}

interface StockMovement {
    id?: string;
    productId: string;
    productName: string;
    type: 'Venda' | 'Ajuste de Entrada' | 'Ajuste de Saída';
    quantity: number;
    reason: string;
    timestamp: string;
    userId: string;
}

// Tipo para a configuração do Firebase, incluindo propriedades do emulador
interface CustomFirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
    firestore?: {
        host: string;
        ssl: boolean;
        projectId: string;
    };
    authEmulator?: string;
}

// =====================================================================
// INICIALIZAÇÃO DO FIREBASE (FORA DO COMPONENTE PARA GARANTIR ÚNICA INSTÂNCIA)
// =====================================================================

const FIREBASE_APP_ID = 'clean-app-665c4'; // SUBSTITUA PELO SEU ID DE PROJETO REAL

const FIREBASE_CONFIG_OBJECT: CustomFirebaseConfig = {
    apiKey: "AIzaSyAmAzsZcQxB9TgSMlURmKvMMKQGLs3Rjac",
    authDomain: "clean-app-665c4.firebaseapp.com",
    projectId: "clean-app-665c4",
    storageBucket: "clean-app-665c4.firebasestorage.app",
    appId: "1:322809583693:web:6a55a675b0a8296013e404",
    messagingSenderId: "322809583693",
    measurementId: "G-Z0YEL2RB17"
};

if (window.location.hostname === "localhost") {
    FIREBASE_CONFIG_OBJECT.firestore = {
        host: "localhost:8080", // Porta padrão do Firestore Emulator
        ssl: false,
        projectId: FIREBASE_APP_ID
    };
    FIREBASE_CONFIG_OBJECT.authEmulator = "http://localhost:9099"; // Porta padrão do Auth Emulator
}

const firebaseApp: FirebaseApp = initializeApp(FIREBASE_CONFIG_OBJECT);
const firebaseFirestore: Firestore = getFirestore(firebaseApp);
const firebaseAuth: Auth = getAuth(firebaseApp);

// =====================================================================
// FIM DA INICIALIZAÇÃO DO FIREBASE
// =====================================================================


export default function App() {
    const [db, setDb] = useState<Firestore | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [loadingFirebase, setLoadingFirebase] = useState<boolean>(true);
    const [authReady, setAuthReady] = useState<boolean>(false);

    const [activeTab, setActiveTab] = useState<string>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [newProduct, setNewProduct] = useState<Product>({ name: '', price: 0, costPrice: 0, stock: 0, category: '', minStock: 5 });
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [newExpense, setNewExpense] = useState<Expense>({ description: '', amount: 0 });
    const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');
    const [cashRegisterBalance, setCashRegisterBalance] = useState<number>(0);
    const [message, setMessage] = useState<{ text: string, type: string } | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [modalAction, setModalAction] = useState<((id: string, amount?: number) => Promise<void> | void) | null>(null);
    const [modalData, setModalData] = useState<any | null>(null); // Pode ser mais específico dependendo do uso

    const [clients, setClients] = useState<Client[]>([]);
    const [newClient, setNewClient] = useState<Client>({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [selectedClientForSale, setSelectedClientForSale] = useState<string>('');
    const [clientSalesHistory, setClientSalesHistory] = useState<Sale[]>([]);
    const [newAttachment, setNewAttachment] = useState<Attachment>({ url: '', description: '' });

    const [monthlySalesTotal, setMonthlySalesTotal] = useState<number>(0);
    const [monthlyExpensesTotal, setMonthlyExpensesTotal] = useState<number>(0);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

    const [reportStartDate, setReportStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [salesReportData, setSalesReportData] = useState<Sale[]>([]);
    const [expensesReportData, setExpensesReportData] = useState<Expense[]>([]);
    const [stockMovementsReport, setStockMovementsReport] = useState<StockMovement[]>([]);
    const [totalReportSales, setTotalReportSales] = useState<number>(0);
    const [totalReportCostOfGoods, setTotalReportCostOfGoods] = useState<number>(0);
    const [totalReportExpenses, setTotalReportExpenses] = useState<number>(0);

    const [showAdjustStockModal, setShowAdjustStockModal] = useState<boolean>(false);
    const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
    const [stockAdjustmentQuantity, setStockAdjustmentQuantity] = useState<string>('');
    const [stockAdjustmentType, setStockAdjustmentType] = useState<string>('entrada');
    const [stockAdjustmentReason, setStockAdjustmentReason] = useState<string>('');

    const appId: string = FIREBASE_APP_ID;
    const initialAuthToken: string | null = null;

    useEffect(() => {
        const setupFirebaseInstances = async () => {
            try {
                setDb(firebaseFirestore);

                const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        try {
                            if (initialAuthToken) {
                                await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            } else {
                                await signInAnonymously(firebaseAuth);
                            }
                            setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                        } catch (error) {
                            console.error("Erro na autenticação:", error);
                            setUserId(crypto.randomUUID());
                        }
                    }
                    setAuthReady(true);
                    setLoadingFirebase(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Erro ao configurar instâncias Firebase:", error);
                setLoadingFirebase(false);
            }
        };

        setupFirebaseInstances();
    }, [initialAuthToken]);

    useEffect(() => {
        const loadScript = (src: string, id: string, callback?: () => void) => {
            if (document.getElementById(id)) {
                if (callback) callback();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.id = id;
            script.onload = () => {
                if (callback) callback();
            };
            script.onerror = () => {
                console.error(`Falha ao carregar script: ${src}`);
                showTemporaryMessage(`Erro ao carregar recurso externo: ${id}`, "error");
            };
            document.head.appendChild(script);
        };

        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script', () => {
            loadScript('https://unpkg.com/jspdf-autotable@3.8.1/dist/jspdf.plugin.autotable.js', 'jspdf-autotable-script', () => {
                console.log("jsPDF e jspdf-autotable carregados.");
            });
        });

        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script', () => {
            console.log("XLSX carregado.");
        });
    }, []);


    const showTemporaryMessage = (msg: string, type: string = 'success') => {
        setMessage({ text: msg, type });
        setTimeout(() => setMessage(null), 3000);
    };

    useEffect(() => {
        if (!db || !authReady || !userId) return;

        const productsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/products`);
        const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Product }));
            setProducts(productsData);
        }, (error) => {
            console.error("Erro ao carregar produtos:", error);
            showTemporaryMessage("Erro ao carregar produtos.", "error");
        });

        return () => unsubscribe();
    }, [db, authReady, userId, appId]);

    const handleAddUpdateProduct = async () => {
        if (!db || !userId) {
            showTemporaryMessage("Erro: Firebase não inicializado.", "error");
            return;
        }

        if (!newProduct.name.trim() || newProduct.price === undefined || newProduct.stock === undefined || !newProduct.category.trim()) {
            showTemporaryMessage("Por favor, preencha todos os campos obrigatórios (Nome, Preço, Estoque, Categoria).", "error");
            return;
        }
        if (isNaN(newProduct.price) || newProduct.price <= 0) {
            showTemporaryMessage("Preço de Venda deve ser um número positivo.", "error");
            return;
        }
        if (isNaN(newProduct.costPrice) || newProduct.costPrice < 0) {
            showTemporaryMessage("Preço de Custo deve ser um número positivo ou zero.", "error");
            return;
        }
        if (isNaN(newProduct.stock) || newProduct.stock < 0) {
            showTemporaryMessage("Estoque deve ser um número inteiro não negativo.", "error");
            return;
        }
        if (isNaN(newProduct.minStock) || newProduct.minStock < 0) {
            showTemporaryMessage("Estoque Mínimo deve ser um número inteiro não negativo.", "error");
            return;
        }

        try {
            const productData: Product = {
                name: newProduct.name.trim(),
                price: newProduct.price,
                costPrice: newProduct.costPrice,
                stock: newProduct.stock,
                category: newProduct.category.trim(),
                minStock: newProduct.minStock,
                lastUpdated: new Date().toISOString()
            };

            if (editingProduct) {
                const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, editingProduct.id!);
                await updateDoc(productRef, productData as DocumentData); // Cast para DocumentData
                showTemporaryMessage("Produto atualizado com sucesso!");
            } else {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/products`), productData as DocumentData); // Cast para DocumentData
                showTemporaryMessage("Produto adicionado com sucesso!");
            }

            setNewProduct({ name: '', price: 0, costPrice: 0, stock: 0, category: '', minStock: 5 });
            setEditingProduct(null);
        } catch (error) {
            console.error("Erro ao adicionar/atualizar produto:", error);
            showTemporaryMessage("Erro ao salvar produto.", "error");
        }
    };

    const startEditingProduct = (product: Product) => {
        setNewProduct({
            name: product.name,
            price: product.price,
            costPrice: product.costPrice,
            stock: product.stock,
            category: product.category,
            minStock: product.minStock || 5
        });
        setEditingProduct(product);
        setActiveTab('products');
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!db || !userId) {
            showTemporaryMessage("Erro: Firebase não inicializado.", "error");
            return;
        }
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/products`, productId));
            showTemporaryMessage("Produto removido com sucesso!");
        } catch (error) {
            console.error("Erro ao remover produto:", error);
            showTemporaryMessage("Erro ao remover produto.", "error");
        }
        setShowModal(false);
    };

    const startAdjustingStock = (product: Product) => {
        setAdjustingProduct(product);
        setStockAdjustmentQuantity('');
        setStockAdjustmentType('entrada');
        setStockAdjustmentReason('');
        setShowAdjustStockModal(true);
    };

    const handleStockAdjustment = async () => {
        if (!db || !userId || !adjustingProduct) {
            showTemporaryMessage("Erro: Operação inválida.", "error");
            return;
        }
        const quantityNum = parseInt(stockAdjustmentQuantity, 10);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            showTemporaryMessage("Quantidade de ajuste inválida.", "error");
            return;
        }
        if (!stockAdjustmentReason.trim()) {
            showTemporaryMessage("Por favor, informe o motivo do ajuste.", "error");
            return;
        }

        const newStock = stockAdjustmentType === 'entrada'
            ? adjustingProduct.stock + quantityNum
            : adjustingProduct.stock - quantityNum;

        if (newStock < 0) {
            showTemporaryMessage("Estoque não pode ser negativo após o ajuste.", "error");
            return;
        }

        try {
            const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, adjustingProduct.id!);
            await updateDoc(productRef, { stock: newStock });

            const stockMovementData: StockMovement = {
                productId: adjustingProduct.id!,
                productName: adjustingProduct.name,
                type: stockAdjustmentType === 'entrada' ? 'Ajuste de Entrada' : 'Ajuste de Saída',
                quantity: quantityNum,
                reason: stockAdjustmentReason.trim(),
                timestamp: new Date().toISOString(),
                userId: userId!
            };
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/stock_movements`), stockMovementData as DocumentData); // Cast para DocumentData

            showTemporaryMessage("Estoque ajustado com sucesso!");
            setShowAdjustStockModal(false);
        } catch (error) {
            console.error("Erro ao ajustar estoque:", error);
            showTemporaryMessage("Erro ao ajustar estoque.", "error");
        }
    };

    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            showTemporaryMessage("Produto fora de estoque.", "error");
            return;
        }
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                showTemporaryMessage("Quantidade máxima em estoque atingida para este item.", "error");
                return;
            }
            setCart(cart.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        showTemporaryMessage(`${product.name} adicionado ao carrinho.`);
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.id !== productId));
        showTemporaryMessage("Produto removido do carrinho.");
    };

    const updateCartQuantity = (productId: string, change: number) => {
        setCart(prevCart => prevCart.map(item => {
            if (item.id === productId) {
                const newQuantity = item.quantity + change;
                if (newQuantity <= 0) return null;
                const productInStock = products.find(p => p.id === productId);
                if (productInStock && newQuantity > productInStock.stock) {
                    showTemporaryMessage("Quantidade solicitada excede o estoque disponível.", "error");
                    return item;
                }
                return { ...item, quantity: newQuantity };
            }
            return item;
        }).filter(Boolean) as CartItem[]);
    };

    const calculateTotal = (): number => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            showTemporaryMessage("O carrinho está vazio.", "error");
            return;
        }
        if (!db || !userId) {
            showTemporaryMessage("Erro: Firebase não inicializado.", "error");
            return;
        }

        const total = calculateTotal();
        const saleData: Sale = {
            timestamp: new Date().toISOString(),
            items: cart.map(item => ({
                productId: item.id!,
                name: item.name,
                price: item.price,
                costPrice: item.costPrice,
                quantity: item.quantity
            })),
            total: total,
            paymentMethod: paymentMethod,
            userId: userId!,
            clientId: selectedClientForSale || null
        };

        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/sales`), saleData as DocumentData); // Cast para DocumentData

            for (const item of cart) {
                const productRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.id!);
                const productDoc = await getDoc(productRef);
                if (productDoc.exists()) {
                    const currentStock = productDoc.data().stock;
                    const newStock = currentStock - item.quantity;
                    await updateDoc(productRef, { stock: newStock });

                    const stockMovementData: StockMovement = {
                        productId: item.id!,
                        productName: item.name,
                        type: 'Venda',
                        quantity: item.quantity,
                        reason: 'Venda de produto',
                        timestamp: new Date().toISOString(),
                        userId: userId!
                    };
                    await addDoc(collection(db, `artifacts/${appId}/users/${userId}/stock_movements`), stockMovementData as DocumentData); // Cast para DocumentData
                }
            }

            const today = new Date().toISOString().split('T')[0];
            const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);
            const cashRegisterDoc = await getDoc(cashRegisterDocRef);

            if (cashRegisterDoc.exists()) {
                const currentSalesTotal = cashRegisterDoc.data().salesTotal || 0;
                await updateDoc(cashRegisterDocRef, { salesTotal: currentSalesTotal + total });
            } else {
                await setDoc(cashRegisterDocRef, {
                    date: today,
                    salesTotal: total,
                    expensesTotal: 0,
                    userId: userId!
                } as DocumentData); // Cast para DocumentData
            }

            setCart([]);
            setSelectedClientForSale('');
            showTemporaryMessage("Venda finalizada com sucesso!");
        } catch (error) {
            console.error("Erro ao finalizar venda:", error);
            showTemporaryMessage("Erro ao finalizar venda.", "error");
        }
    };

    useEffect(() => {
        if (!db || !authReady || !userId) return;

        const expensesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/expenses`);
        const unsubscribe = onSnapshot(expensesCollectionRef, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Expense }));
            setExpenses(expensesData.sort((a, b) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime()));
        }, (error) => {
            console.error("Erro ao carregar despesas:", error);
            showTemporaryMessage("Erro ao carregar despesas.", "error");
        });

        return () => unsubscribe();
    }, [db, authReady, userId, appId]);

    const handleAddExpense = async () => {
        if (!db || !userId) {
            showTemporaryMessage("Erro: Firebase não inicializado.", "error");
            return;
        }

        if (!newExpense.description.trim() || newExpense.amount === undefined) {
            showTemporaryMessage("Por favor, preencha a descrição e o valor da despesa.", "error");
            return;
        }
        if (isNaN(newExpense.amount) || newExpense.amount <= 0) {
            showTemporaryMessage("Valor da despesa deve ser um número positivo.", "error");
            return;
        }

        try {
            const expenseData: Expense = {
                description: newExpense.description.trim(),
                amount: newExpense.amount,
                timestamp: new Date().toISOString(),
            };
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/expenses`), expenseData as DocumentData); // Cast para DocumentData
            showTemporaryMessage("Despesa adicionada com sucesso!");
            setNewExpense({ description: '', amount: 0 });

            const today = new Date().toISOString().split('T')[0];
            const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);
            const cashRegisterDoc = await getDoc(cashRegisterDocRef);

            if (cashRegisterDoc.exists()) {
                const currentExpensesTotal = cashRegisterDoc.data().expensesTotal || 0;
                await updateDoc(cashRegisterDocRef, { expensesTotal: currentExpensesTotal + expenseData.amount });
            } else {
                await setDoc(cashRegisterDocRef, {
                    date: today,
                    salesTotal: 0,
                    expensesTotal: expenseData.amount,
                    userId: userId!
                } as DocumentData); // Cast para DocumentData
            }

        } catch (error) {
            console.error("Erro ao adicionar despesa:", error);
            showTemporaryMessage("Erro ao adicionar despesa.", "error");
        }
    };

    const handleDeleteExpense = async (expenseId: string, amount: number) => {
        if (!db || !userId) {
            showTemporaryMessage("Erro: Firebase não inicializado.", "error");
            return;
        }
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/expenses`, expenseId));
            showTemporaryMessage("Despesa removida com sucesso!");

            const today = new Date().toISOString().split('T')[0];
            const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);
            const cashRegisterDoc = await getDoc(cashRegisterDocRef);

            if (cashRegisterDoc.exists()) {
                const currentExpensesTotal = cashRegisterDoc.data().expensesTotal || 0;
                await updateDoc(cashRegisterDocRef, { expensesTotal: currentExpensesTotal - amount });
            }

        } catch (error) {
            console.error("Erro ao remover despesa:", error);
            showTemporaryMessage("Erro ao remover despesa.", "error");
        }
        setShowModal(false);
    };

    useEffect(() => {
        if (!db || !authReady || !userId) return;

        const today = new Date().toISOString().split('T')[0];
        const cashRegisterDocRef = doc(db, `artifacts/${appId}/users/${userId}/cash_register_summary`, today);

        const unsubscribe = onSnapshot(cashRegisterDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const totalBalance = (data.salesTotal || 0) - (data.expensesTotal || 0);
                setCashRegisterBalance(totalBalance);
            } else {
                setCashRegisterBalance(0);
            }
        }, (error) => {
            console.error("Erro ao carregar saldo do caixa diário:", error);
            showTemporaryMessage("Erro ao carregar saldo do caixa diário.", "error");
        });

        return () => unsubscribe();
    }, [db, authReady, userId, appId]);

    const calculateMonthlyCashFlow = useCallback(async () => {
        if (!db || !authReady || !userId || !selectedMonth) return;

        const startOfMonth = new Date(`${selectedMonth}-01T00:00:00Z`);
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);

        let totalSales = 0;
        let totalExpenses = 0;

        try {
            const cashRegisterSummaryRef = collection(db, `artifacts/${appId}/users/${userId}/cash_register_summary`);
            const q = query(cashRegisterSummaryRef);
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const docDate = new Date(data.date + 'T00:00:00Z');

                if (docDate >= startOfMonth && docDate <= endOfMonth) {
                    totalSales += (data.salesTotal || 0);
                    totalExpenses += (data.expensesTotal || 0);
                }
            });

            setMonthlySalesTotal(totalSales);
            setMonthlyExpensesTotal(totalExpenses);

        } catch (error) {
            console.error("Erro ao calcular fluxo de caixa mensal:", error);
            showTemporaryMessage("Erro ao calcular fluxo de caixa mensal.", "error");
        }
    }, [db, authReady, userId, appId, selectedMonth]);

    useEffect(() => {
        calculateMonthlyCashFlow();
    }, [selectedMonth, calculateMonthlyCashFlow]);

    useEffect(() => {
        if (!db || !authReady || !userId) return;

        const clientsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/clients`);
        const unsubscribe = onSnapshot(clientsCollectionRef, (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Client }));
            setClients(clientsData);
        }, (error) => {
            console.error("Erro ao carregar clientes:", error);
            showTemporaryMessage("Erro ao carregar clientes.", "error");
        });

        return () => unsubscribe();
    }, [db, authReady, userId, appId]);

    const handleAddUpdateClient = async () => {
        if (!db || !userId) {
            showTemporaryMessage("Erro: Firebase não inicializado.", "error");
            return;
        }

        if (!newClient.name.trim() || !newClient.documentNumber.trim()) {
            showTemporaryMessage("Nome e Número de Documento são obrigatórios para o cliente.", "error");
            return;
        }

        try {
            const clientData: Client = {
                name: newClient.name.trim(),
                documentType: newClient.documentType,
                documentNumber: newClient.documentNumber.trim(),
                contactPhone: newClient.contactPhone.trim(),
                contactEmail: newClient.contactEmail.trim(),
                address: newClient.address.trim(),
                invoicingNotes: newClient.invoicingNotes,
                lastUpdated: new Date().toISOString(),
            };

            if (editingClient) {
                const clientRef = doc(db, `artifacts/${appId}/users/${userId}/clients`, editingClient.id!);
                await updateDoc(clientRef, clientData as DocumentData); // Cast para DocumentData
                showTemporaryMessage("Cliente atualizado com sucesso!");
            } else {
                const q = query(collection(db, `artifacts/${appId}/users/${userId}/clients`),
                                where("documentType", "==", newClient.documentType),
                                where("documentNumber", "==", newClient.documentNumber.trim()));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    showTemporaryMessage("Já existe um cliente com este tipo e número de documento.", "error");
                    return;
                }
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/clients`), { ...clientData, userId: userId! } as DocumentData); // Cast para DocumentData
                showTemporaryMessage("Cliente adicionado com sucesso!");
            }

            setNewClient({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
            setNewAttachment({ url: '', description: '' });
            setEditingClient(null);
        } catch (error) {
            console.error("Erro ao adicionar/atualizar cliente:", error);
            showTemporaryMessage("Erro ao salvar cliente.", "error");
        }
    };

    const handleAddAttachment = () => {
        if (!newAttachment.description.trim()) {
            showTemporaryMessage("A descrição do anexo é obrigatória.", "error");
            return;
        }
        setNewClient((prevClient: Client) => ({
            ...prevClient,
            invoicingNotes: [...prevClient.invoicingNotes, { ...newAttachment }]
        }));
        setNewAttachment({ url: '', description: '' });
    };

    const handleRemoveAttachment = (indexToRemove: number) => {
        setNewClient((prevClient: Client) => ({
            ...prevClient,
            invoicingNotes: prevClient.invoicingNotes.filter((_: Attachment, index: number) => index !== indexToRemove)
        }));
    };

    const startEditingClient = (client: Client) => {
        setNewClient({
            name: client.name,
            documentType: client.documentType,
            documentNumber: client.documentNumber,
            contactPhone: client.contactPhone,
            contactEmail: client.contactEmail,
            address: client.address,
            invoicingNotes: client.invoicingNotes || []
        });
        setNewAttachment({ url: '', description: '' });
        setEditingClient(client);
        setActiveTab('clients');
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!db || !userId) {
            showTemporaryMessage("Erro: Firebase não inicializado.", "error");
            return;
        }
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/clients`, clientId));
            showTemporaryMessage("Cliente removido com sucesso!");
        } catch (error) {
            console.error("Erro ao remover cliente:", error);
            showTemporaryMessage("Erro ao remover cliente.", "error");
        }
        setShowModal(false);
    };

    const fetchClientSalesHistory = useCallback(async (clientId: string) => {
        if (!db || !userId || !clientId) {
            setClientSalesHistory([]);
            return;
        }
        try {
            const salesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
            const q = query(salesCollectionRef, where("clientId", "==", clientId));
            const querySnapshot = await getDocs(q);
            const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Sale }));
            setClientSalesHistory(history.sort((a: Sale, b: Sale) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (error) {
            console.error("Erro ao carregar histórico de vendas do cliente:", error);
            showTemporaryMessage("Erro ao carregar histórico de vendas do cliente.", "error");
            setClientSalesHistory([]);
        }
    }, [db, userId, appId]);

    useEffect(() => {
        if (editingClient) {
            fetchClientSalesHistory(editingClient.id!);
        } else {
            setClientSalesHistory([]);
        }
    }, [editingClient, fetchClientSalesHistory]);

    const generateReports = useCallback(async () => {
        if (!db || !userId) return;

        const start = new Date(reportStartDate + 'T00:00:00Z');
        const end = new Date(reportEndDate + 'T23:59:59.999Z');

        const salesTemp: Sale[] = [];
        const expensesTemp: Expense[] = [];
        const stockMovementsTemp: StockMovement[] = [];
        let totalSales = 0;
        let totalCostOfGoods = 0;
        let totalExpenses = 0;

        try {
            const salesRef = collection(db, `artifacts/${appId}/users/${userId}/sales`);
            const salesQuery = query(salesRef);
            const salesSnapshot = await getDocs(salesQuery);
            salesSnapshot.forEach(docSnap => {
                const sale = { id: docSnap.id, ...docSnap.data() as Sale };
                const saleDate = new Date(sale.timestamp);
                if (saleDate >= start && saleDate <= end) {
                    salesTemp.push(sale);
                    totalSales += sale.total;
                    sale.items.forEach((item: SaleItem) => {
                        totalCostOfGoods += (item.costPrice || 0) * item.quantity;
                    });
                }
            });
            setSalesReportData(salesTemp.sort((a: Sale, b: Sale) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

            const expensesRef = collection(db, `artifacts/${appId}/users/${userId}/expenses`);
            const expensesQuery = query(expensesRef);
            const expensesSnapshot = await getDocs(expensesQuery);
            expensesSnapshot.forEach(docSnap => {
                const expense = { id: docSnap.id, ...docSnap.data() as Expense };
                const expenseDate = new Date(expense.timestamp ?? ''); // Usar ?? ''
                if (expenseDate >= start && expenseDate <= end) {
                    expensesTemp.push(expense);
                    totalExpenses += expense.amount;
                }
            });
            setExpensesReportData(expensesTemp.sort((a: Expense, b: Expense) => new Date(b.timestamp ?? '').getTime() - new Date(a.timestamp ?? '').getTime())); // Usar ?? ''

            const stockMovementsRef = collection(db, `artifacts/${appId}/users/${userId}/stock_movements`);
            const stockMovementsQuery = query(stockMovementsRef);
            const stockMovementsSnapshot = await getDocs(stockMovementsQuery);
            stockMovementsSnapshot.forEach(docSnap => {
                const movement = { id: docSnap.id, ...docSnap.data() as StockMovement };
                const movementDate = new Date(movement.timestamp);
                if (movementDate >= start && movementDate <= end) {
                    stockMovementsTemp.push(movement);
                }
            });
            setStockMovementsReport(stockMovementsTemp.sort((a: StockMovement, b: StockMovement) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

            setTotalReportSales(totalSales);
            setTotalReportCostOfGoods(totalCostOfGoods);
            setTotalReportExpenses(totalExpenses);

        } catch (error) {
            console.error("Erro ao gerar relatórios:", error);
            showTemporaryMessage("Erro ao gerar relatórios.", "error");
        }
    }, [db, userId, appId, reportStartDate, reportEndDate]);

    useEffect(() => {
        if (activeTab === 'reports' && db && userId) {
            generateReports();
        }
    }, [activeTab, reportStartDate, reportEndDate, db, userId, generateReports]);

    const exportToPdf = (tableId: string, fileName: string) => {
        if (typeof (window as any).jsPDF === 'undefined' || typeof (window as any).jspdf?.plugin?.autotable === 'undefined') {
            showTemporaryMessage("Bibliotecas PDF não carregadas. Tente novamente em alguns segundos.", "error");
            return;
        }

        const doc = new (window as any).jsPDF.jsPDF();
        doc.setFontSize(12);
        const table = document.getElementById(tableId);

        if (!table) {
            showTemporaryMessage(`Tabela com ID '${tableId}' não encontrada para exportação PDF.`, "error");
            return;
        }

        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim() || '');
        const data = Array.from(table.querySelectorAll('tbody tr')).map(row =>
            Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
        );

        (doc as any).autoTable({
            head: [headers],
            body: data,
            startY: 10,
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: [0, 0, 0],
                fontStyle: 'bold'
            },
            columnStyles: {
                4: { halign: 'right' }
            }
        });

        doc.save(`${fileName}.pdf`);
        showTemporaryMessage(`Relatório ${fileName}.pdf exportado com sucesso!`);
    };

    const exportToXlsx = (data: any[], fileName: string) => {
        if (typeof (window as any).XLSX === 'undefined') {
            showTemporaryMessage("Biblioteca XLSX não carregada. Tente novamente em alguns segundos.", "error");
            return;
        }

        if (data.length === 0) {
            showTemporaryMessage("Não há dados para exportar em XLSX.", "error");
            return;
        }
        const ws = (window as any).XLSX.utils.json_to_sheet(data);
        const wb = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(wb, ws, "Dados");
        (window as any).XLSX.writeFile(wb, `${fileName}.xlsx`);
        showTemporaryMessage(`Relatório ${fileName}.xlsx exportado com sucesso!`);
    };

    const confirmAction = (action: (...args: any[]) => void, data: any) => {
        setModalAction(() => action);
        setModalData(data);
        setShowModal(true);
    };

    if (loadingFirebase) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
                <p className="ml-4 text-green-700 text-lg">Carregando Firebase...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex flex-col p-4 font-sans antialiased">
            <header className="bg-white shadow-lg rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 mb-4 sm:mb-0">
                    Limpeza Fácil 🧼
                </h1>
                <nav className="flex flex-wrap justify-center sm:justify-end gap-3">
                    <button
                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                            ${activeTab === 'products' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                        onClick={() => setActiveTab('products')}
                    >
                        Produtos
                    </button>
                    <button
                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                            ${activeTab === 'pos' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                        onClick={() => setActiveTab('pos')}
                    >
                        PDV (Vendas)
                    </button>
                    <button
                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                            ${activeTab === 'expenses' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                        onClick={() => setActiveTab('expenses')}
                    >
                        Despesas
                    </button>
                    <button
                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                            ${activeTab === 'cashRegister' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                        onClick={() => setActiveTab('cashRegister')}
                    >
                        Fluxo de Caixa
                    </button>
                    <button
                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                            ${activeTab === 'clients' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                        onClick={() => setActiveTab('clients')}
                    >
                        Clientes (CRM)
                    </button>
                    <button
                        className={`px-5 py-2 rounded-lg font-semibold transition duration-300 ease-in-out transform hover:scale-105
                            ${activeTab === 'reports' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-green-100 hover:text-green-700'}`}
                        onClick={() => setActiveTab('reports')}
                    >
                        Relatórios
                    </button>
                </nav>
            </header>

            {message && (
                <div className={`p-3 mb-4 rounded-lg text-white font-semibold text-center
                    ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    {message.text}
                </div>
            )}

            <div className="text-center text-sm text-gray-600 mb-4">
                ID do Usuário: {userId}
            </div>

            <main className="flex-grow bg-white shadow-xl rounded-xl p-6">
                {activeTab === 'products' && (
                    <section>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
                            Gerenciar Produtos
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                            <div className="bg-green-50 p-6 rounded-lg shadow-inner">
                                <h3 className="text-2xl font-semibold text-green-800 mb-4">
                                    {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
                                </h3>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Nome do Produto"
                                        value={newProduct.name}
                                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Preço de Venda (R$)"
                                        
                                        onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Preço de Custo (R$ - opcional)"
                                        
                                        onChange={(e) => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Estoque Atual"
                                       
                                        onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Estoque Mínimo (Alerta)"
                                        
                                        onChange={(e) => setNewProduct({ ...newProduct, minStock: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Categoria (ex: Desinfetantes)"
                                        value={newProduct.category}
                                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <button
                                        onClick={handleAddUpdateProduct}
                                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
                                    >
                                        {editingProduct ? 'Atualizar Produto' : 'Adicionar Produto'}
                                    </button>
                                    {editingProduct && (
                                        <button
                                            onClick={() => {
                                                setNewProduct({ name: '', price: 0, costPrice: 0, stock: 0, category: '', minStock: 5 });
                                                setEditingProduct(null);
                                            }}
                                            className="w-full mt-2 bg-gray-400 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-500 transition duration-300 ease-in-out transform hover:scale-105"
                                        >
                                            Cancelar Edição
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2 bg-blue-50 p-6 rounded-lg shadow-inner">
                                <h3 className="text-2xl font-semibold text-blue-800 mb-4">
                                    Lista de Produtos ({products.length})
                                </h3>
                                <div className="max-h-96 overflow-y-auto pr-2">
                                    {products.length === 0 ? (
                                        <p className="text-gray-600">Nenhum produto cadastrado ainda.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {products.map((product) => (
                                                <li key={product.id} className={`bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center ${product.stock <= product.minStock ? 'border-l-4 border-red-500' : 'border-l-4 border-transparent'}`}>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{product.name}</p>
                                                        <p className="text-sm text-gray-600">Preço: R$ {product.price?.toFixed(2)} | Custo: R$ {product.costPrice?.toFixed(2)}</p>
                                                        <p className="text-sm text-gray-600">Estoque: {product.stock} {product.stock <= product.minStock && <span className="text-red-500 font-semibold">(Estoque Baixo!)</span>}</p>
                                                        <p className="text-sm text-gray-600">Categoria: {product.category}</p>
                                                    </div>
                                                    <div className="flex gap-2 mt-3 sm:mt-0">
                                                        <button
                                                            onClick={() => startAdjustingStock(product)}
                                                            className="bg-purple-500 text-white p-2 rounded-md hover:bg-purple-600 transition duration-200"
                                                            title="Ajustar Estoque"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4zm6 0H7v9.05L10 12l3 1.05V4h-2z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => startEditingProduct(product)}
                                                            className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200"
                                                            title="Editar"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.657 5.657l2.828 2.828-5.657 5.657H3v-2.828l5.657-5.657z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => confirmAction(handleDeleteProduct, { id: product.id })}
                                                            className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-200"
                                                            title="Remover"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'pos' && (
                    <section>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
                            Ponto de Venda (PDV)
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-green-50 p-6 rounded-lg shadow-inner">
                                <h3 className="text-2xl font-semibold text-green-800 mb-4">
                                    Produtos Disponíveis
                                </h3>
                                <div className="max-h-96 overflow-y-auto pr-2">
                                    {products.length === 0 ? (
                                        <p className="text-gray-600">Nenhum produto cadastrado para venda.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {products.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition duration-200
                                                    ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    onClick={() => product.stock > 0 && addToCart(product)}
                                                >
                                                    <p className="font-bold text-gray-900">{product.name}</p>
                                                    <p className="text-sm text-gray-600">R$ {product.price?.toFixed(2)}</p>
                                                    <p className="text-sm text-gray-600">Estoque: {product.stock} {product.stock <= product.minStock && <span className="text-red-500 font-semibold">(Baixo)</span>}</p>
                                                    {product.stock === 0 && <p className="text-red-500 font-semibold text-xs mt-1">Fora de estoque</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-6 rounded-lg shadow-inner flex flex-col">
                                <h3 className="text-2xl font-semibold text-blue-800 mb-4">
                                    Carrinho de Compras
                                </h3>
                                <div className="flex-grow max-h-72 overflow-y-auto pr-2 mb-4">
                                    {cart.length === 0 ? (
                                        <p className="text-gray-600">Carrinho vazio.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {cart.map((item) => (
                                                <li key={item.id} className="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{item.name}</p>
                                                        <p className="text-sm text-gray-600">R$ {item.price?.toFixed(2)} x {item.quantity}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateCartQuantity(item.id!, -1)}
                                                            className="bg-gray-300 text-gray-800 p-1 rounded-full hover:bg-gray-400"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        <span className="font-semibold">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateCartQuantity(item.id!, 1)}
                                                            className="bg-gray-300 text-gray-800 p-1 rounded-full hover:bg-gray-400"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => removeFromCart(item.id!)}
                                                            className="text-red-500 hover:text-red-700"
                                                            title="Remover"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="mt-auto pt-4 border-t border-gray-200">
                                    <p className="text-xl font-bold text-gray-900 mb-3">Total: R$ {calculateTotal().toFixed(2)}</p>
                                    <div className="mb-4">
                                        <label htmlFor="clientSelect" className="block text-gray-700 text-sm font-semibold mb-2">
                                            Cliente (Opcional):
                                        </label>
                                        <select
                                            id="clientSelect"
                                            value={selectedClientForSale}
                                            onChange={(e) => setSelectedClientForSale(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        >
                                            <option value="">-- Selecione um cliente --</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>
                                                    {client.name} ({client.documentType}: {client.documentNumber})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <label htmlFor="paymentMethod" className="block text-gray-700 text-sm font-semibold mb-2">
                                            Método de Pagamento:
                                        </label>
                                        <select
                                            id="paymentMethod"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        >
                                            <option value="Dinheiro">Dinheiro</option>
                                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                                            <option value="Cartão de Débito">Cartão de Débito</option>
                                            <option value="PIX">PIX</option>
                                            <option value="Fiado">Fiado</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleCheckout}
                                        className="w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105"
                                    >
                                        Finalizar Venda
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'expenses' && (
                    <section>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
                            Gerenciar Despesas
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-6 rounded-lg shadow-inner">
                                <h3 className="text-2xl font-semibold text-green-800 mb-4">
                                    Adicionar Nova Despesa
                                </h3>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Descrição da Despesa"
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Valor (R$)"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <button
                                        onClick={handleAddExpense}
                                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
                                    >
                                        Adicionar Despesa
                                    </button>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-6 rounded-lg shadow-inner">
                                <h3 className="text-2xl font-semibold text-blue-800 mb-4">
                                    Lista de Despesas
                                </h3>
                                <div className="max-h-96 overflow-y-auto pr-2">
                                    {expenses.length === 0 ? (
                                        <p className="text-gray-600">Nenhuma despesa registrada ainda.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {expenses.map((expense) => (
                                                <li key={expense.id} className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{expense.description}</p>
                                                        <p className="text-sm text-gray-600">R$ {expense.amount?.toFixed(2)}</p>
                                                        <p className="text-xs text-gray-500">{new Date(expense.timestamp ?? '').toLocaleDateString()} {new Date(expense.timestamp ?? '').toLocaleTimeString()}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => confirmAction(handleDeleteExpense, { id: expense.id, amount: expense.amount })}
                                                        className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-200"
                                                        title="Remover"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'cashRegister' && (
                    <section>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
                            Fluxo de Caixa
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 p-6 rounded-lg shadow-inner text-center">
                                <h3 className="text-2xl font-semibold text-green-800 mb-4">
                                    Saldo do Caixa Hoje ({new Date().toLocaleDateString()})
                                </h3>
                                <p className={`text-5xl font-extrabold ${cashRegisterBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    R$ {cashRegisterBalance.toFixed(2)}
                                </p>
                                <p className="text-gray-700 mt-4">
                                    Este valor reflete o total de vendas menos o total de despesas registradas para o dia de hoje.
                                </p>
                            </div>

                            <div className="bg-blue-50 p-6 rounded-lg shadow-inner">
                                <h3 className="text-2xl font-semibold text-blue-800 mb-4">
                                    Análise Mensal
                                </h3>
                                <div className="mb-4">
                                    <label htmlFor="monthPicker" className="block text-gray-700 text-sm font-semibold mb-2">
                                        Selecionar Mês:
                                    </label>
                                    <input
                                        type="month"
                                        id="monthPicker"
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <p className="text-lg font-semibold text-gray-800">
                                        Vendas Mensais: <span className="text-green-600 font-bold">R$ {monthlySalesTotal.toFixed(2)}</span>
                                    </p>
                                    <p className="text-lg font-semibold text-gray-800">
                                        Despesas Mensais: <span className="text-red-600 font-bold">R$ {monthlyExpensesTotal.toFixed(2)}</span>
                                    </p>
                                    <p className="text-2xl font-extrabold">
                                        Saldo Mensal: <span className={`${(monthlySalesTotal - monthlyExpensesTotal) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                            R$ {(monthlySalesTotal - monthlyExpensesTotal).toFixed(2)}
                                        </span>
                                    </p>
                                </div>
                                <p className="text-gray-500 text-sm mt-4">
                                    (Gráficos de análise podem ser implementados com bibliotecas como Recharts para visualizações mais ricas).
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'clients' && (
                    <section>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
                            Gerenciar Clientes (CRM)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                            <div className="bg-green-50 p-6 rounded-lg shadow-inner col-span-1 lg:col-span-1">
                                <h3 className="text-2xl font-semibold text-green-800 mb-4">
                                    {editingClient ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
                                </h3>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Nome do Cliente/Empresa"
                                        value={newClient.name}
                                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <select
                                        value={newClient.documentType}
                                        onChange={(e) => setNewClient({ ...newClient, documentType: e.target.value as 'CPF' | 'CNPJ' })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    >
                                        <option value="CPF">CPF</option>
                                        <option value="CNPJ">CNPJ</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder={`Número do Documento (${newClient.documentType})`}
                                        value={newClient.documentNumber}
                                        onChange={(e) => setNewClient({ ...newClient, documentNumber: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Telefone de Contato"
                                        value={newClient.contactPhone}
                                        onChange={(e) => setNewClient({ ...newClient, contactPhone: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email de Contato"
                                        value={newClient.contactEmail}
                                        onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                    <textarea
                                        placeholder="Endereço Completo"
                                        value={newClient.address}
                                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                                        rows={3}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    ></textarea>

                                    <div className="border p-4 rounded-md bg-gray-50">
                                        <h4 className="font-semibold mb-2 text-gray-700">Anexos de Faturamento (Links/Notas)</h4>
                                        <input
                                            type="text"
                                            placeholder="Descrição do Anexo (ex: NF-e 123)"
                                            value={newAttachment.description}
                                            onChange={(e) => setNewAttachment({ ...newAttachment, description: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                        <input
                                            type="url"
                                            placeholder="URL do Anexo (Opcional)"
                                            value={newAttachment.url}
                                            onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                                            className="w-full p-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                        <button
                                            onClick={handleAddAttachment}
                                            className="w-full bg-indigo-400 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-500 transition duration-200"
                                        >
                                            Adicionar Anexo
                                        </button>
                                        <ul className="mt-3 space-y-1 text-sm">
                                            {newClient.invoicingNotes.map((note: Attachment, index: number) => (
                                                <li key={index} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm">
                                                    {note.url ? (
                                                        <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                            {note.description}
                                                        </a>
                                                    ) : (
                                                        <span>{note.description}</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveAttachment(index)}
                                                        className="text-red-500 hover:text-red-700 ml-2"
                                                        title="Remover Anexo"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <button
                                        onClick={handleAddUpdateClient}
                                        className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105"
                                    >
                                        {editingClient ? 'Atualizar Cliente' : 'Adicionar Cliente'}
                                    </button>
                                    {editingClient && (
                                        <button
                                            onClick={() => {
                                                setNewClient({ name: '', documentType: 'CPF', documentNumber: '', contactPhone: '', contactEmail: '', address: '', invoicingNotes: [] });
                                                setNewAttachment({ url: '', description: '' });
                                                setEditingClient(null);
                                            }}
                                            className="w-full mt-2 bg-gray-400 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-500 transition duration-300 ease-in-out transform hover:scale-105"
                                        >
                                            Cancelar Edição
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2 bg-blue-50 p-6 rounded-lg shadow-inner flex flex-col">
                                <h3 className="text-2xl font-semibold text-blue-800 mb-4">
                                    Lista de Clientes ({clients.length})
                                </h3>
                                <div className="flex-grow max-h-96 overflow-y-auto pr-2 mb-4">
                                    {clients.length === 0 ? (
                                        <p className="text-gray-600">Nenhum cliente cadastrado ainda.</p>
                                    ) : (
                                        <ul className="space-y-3">
                                            {clients.map((client) => (
                                                <li key={client.id} className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{client.name}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {client.documentType}: {client.documentNumber}
                                                            {client.contactPhone && ` | Tel: ${client.contactPhone}`}
                                                            {client.contactEmail && ` | Email: ${client.contactEmail}`}
                                                        </p>
                                                        {client.address && <p className="text-xs text-gray-500">End: {client.address}</p>}
                                                        {client.invoicingNotes && client.invoicingNotes.length > 0 && (
                                                            <div className="mt-1">
                                                                <p className="text-xs font-semibold text-gray-700">Anexos:</p>
                                                                <ul className="list-disc list-inside text-xs text-gray-500">
                                                                    {client.invoicingNotes.map((note: Attachment, idx: number) => (
                                                                        <li key={idx}>
                                                                            {note.url ? (
                                                                                <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                                                    {note.description || note.url}
                                                                                </a>
                                                                            ) : (
                                                                                <span>{note.description}</span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 mt-3 sm:mt-0">
                                                        <button
                                                            onClick={() => startEditingClient(client)}
                                                            className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200"
                                                            title="Editar"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-5.657 5.657l2.828 2.828-5.657 5.657H3v-2.828l5.657-5.657z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => confirmAction(handleDeleteClient, { id: client.id })}
                                                            className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition duration-200"
                                                            title="Remover"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {editingClient && (
                                    <div className="mt-6 pt-4 border-t border-gray-200">
                                        <h4 className="text-xl font-semibold text-blue-800 mb-3">
                                            Histórico de Vendas de {editingClient.name}
                                        </h4>
                                        <div className="max-h-48 overflow-y-auto pr-2">
                                            {clientSalesHistory.length === 0 ? (
                                                <p className="text-gray-600 text-sm">Nenhuma venda registrada para este cliente ainda.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {clientSalesHistory.map(sale => (
                                                        <li key={sale.id} className="bg-gray-100 p-3 rounded-md text-sm">
                                                            <p className="font-semibold">Venda: R$ {sale.total.toFixed(2)} ({sale.paymentMethod})</p>
                                                            <p className="text-xs text-gray-600">Data: {new Date(sale.timestamp).toLocaleDateString()} {new Date(sale.timestamp).toLocaleTimeString()}</p>
                                                            <ul className="list-disc list-inside mt-1 ml-2 text-gray-500">
                                                                {sale.items.map((item: SaleItem, idx: number) => (
                                                                    <li key={idx}>{item.name} (x{item.quantity}) - R$ {item.price.toFixed(2)} cada</li>
                                                                ))}
                                                            </ul>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'reports' && (
                    <section>
                        <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 pb-2 border-green-300">
                            Relatórios Detalhados
                        </h2>
                        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
                            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                                Filtro por Período
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label htmlFor="reportStartDate" className="block text-gray-700 text-sm font-semibold mb-2">
                                        Data de Início:
                                    </label>
                                    <input
                                        type="date"
                                        id="reportStartDate"
                                        value={reportStartDate}
                                        onChange={(e) => setReportStartDate(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="reportEndDate" className="block text-gray-700 text-sm font-semibold mb-2">
                                        Data de Fim:
                                    </label>
                                    <input
                                        type="date"
                                        id="reportEndDate"
                                        value={reportEndDate}
                                        onChange={(e) => setReportEndDate(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-400"
                                    />
                                </div>
                                <button
                                    onClick={generateReports}
                                    className="w-full bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-600 transition duration-300 ease-in-out transform hover:scale-105"
                                >
                                    Gerar Relatórios
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                <h4 className="text-xl font-semibold text-green-800 mb-2">Total de Vendas</h4>
                                <p className="text-3xl font-bold text-green-600">R$ {totalReportSales.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                <h4 className="text-xl font-semibold text-red-800 mb-2">Total de Despesas</h4>
                                <p className="text-3xl font-bold text-red-600">R$ {totalReportExpenses.toFixed(2)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                                <h4 className="text-xl font-semibold text-purple-800 mb-2">Lucro Bruto</h4>
                                <p className="text-3xl font-bold text-purple-600">R$ {(totalReportSales - totalReportCostOfGoods).toFixed(2)}</p>
                                <p className="text-sm text-gray-500">(Vendas - Custo dos Produtos)</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                                Relatório de Vendas
                                <div className="inline-flex gap-2 ml-4">
                                    <button onClick={() => exportToPdf('salesTable', 'Relatorio_Vendas')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">PDF</button>
                                    <button onClick={() => exportToXlsx(salesReportData.map((s: Sale) => ({
                                        Data: new Date(s.timestamp).toLocaleDateString(),
                                        Cliente: clients.find(c => c.id === s.clientId)?.name || 'N/A',
                                        Itens: s.items.map((item: SaleItem) => `${item.name} (x${item.quantity})`).join(', '),
                                        MetodoPagamento: s.paymentMethod,
                                        Total: s.total.toFixed(2)
                                    })), 'Relatorio_Vendas')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">XLSX</button>
                                </div>
                            </h3>
                            {salesReportData.length === 0 ? (
                                <p className="text-gray-600">Nenhuma venda no período selecionado.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table id="salesTable" className="min-w-full bg-white rounded-lg overflow-hidden">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Data</th>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Cliente</th>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Itens</th>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Método Pag.</th>
                                                <th className="py-2 px-4 text-right text-gray-600 font-semibold">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salesReportData.map(sale => (
                                                <tr key={sale.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="py-2 px-4 text-sm text-gray-800">{new Date(sale.timestamp).toLocaleDateString()}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800">{clients.find(c => c.id === sale.clientId)?.name || 'N/A'}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800">
                                                        {sale.items.map((item: SaleItem) => `${item.name} (x${item.quantity})`).join(', ')}
                                                    </td>
                                                    <td className="py-2 px-4 text-sm text-gray-800">{sale.paymentMethod}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800 text-right">R$ {sale.total.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                                Relatório de Despesas
                                <div className="inline-flex gap-2 ml-4">
                                    <button onClick={() => exportToPdf('expensesTable', 'Relatorio_Despesas')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">PDF</button>
                                    <button onClick={() => exportToXlsx(expensesReportData.map((e: Expense) => ({
                                        Data: new Date(e.timestamp!).toLocaleDateString(),
                                        Descricao: e.description,
                                        Valor: e.amount.toFixed(2)
                                    })), 'Relatorio_Despesas')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">XLSX</button>
                                </div>
                            </h3>
                            {expensesReportData.length === 0 ? (
                                <p className="text-gray-600">Nenhuma despesa no período selecionado.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table id="expensesTable" className="min-w-full bg-white rounded-lg overflow-hidden">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Data</th>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Descrição</th>
                                                <th className="py-2 px-4 text-right text-gray-600 font-semibold">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expensesReportData.map(expense => (
                                                <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="py-2 px-4 text-sm text-gray-800">{new Date(expense.timestamp ?? '').toLocaleDateString()}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800">{expense.description}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800 text-right">R$ {expense.amount.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md">
                            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                                Relatório de Movimentação de Estoque
                                <div className="inline-flex gap-2 ml-4">
                                    <button onClick={() => exportToPdf('stockMovementsTable', 'Relatorio_Movimentacao_Estoque')} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">PDF</button>
                                    <button onClick={() => exportToXlsx(stockMovementsReport.map((m: StockMovement) => ({
                                        Data: new Date(m.timestamp).toLocaleDateString(),
                                        Produto: m.productName,
                                        Tipo: m.type,
                                        Quantidade: m.quantity,
                                        Motivo: m.reason
                                    })), 'Relatorio_Movimentacao_Estoque')} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">XLSX</button>
                                </div>
                            </h3>
                            {stockMovementsReport.length === 0 ? (
                                <p className="text-gray-600">Nenhuma movimentação de estoque no período selecionado.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table id="stockMovementsTable" className="min-w-full bg-white rounded-lg overflow-hidden">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Data</th>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Produto</th>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Tipo</th>
                                                <th className="py-2 px-4 text-right text-gray-600 font-semibold">Quantidade</th>
                                                <th className="py-2 px-4 text-left text-gray-600 font-semibold">Motivo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stockMovementsReport.map(movement => (
                                                <tr key={movement.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                    <td className="py-2 px-4 text-sm text-gray-800">{new Date(movement.timestamp).toLocaleDateString()}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800">{movement.productName}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800">{movement.type}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800 text-right">{movement.quantity}</td>
                                                    <td className="py-2 px-4 text-sm text-gray-800">{movement.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>

            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Ação</h3>
                        <p className="text-gray-700 mb-6">
                            Tem certeza que deseja prosseguir com esta ação?
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => {
                                    if (modalAction && modalData) {
                                        if (modalAction === handleDeleteExpense) {
                                            modalAction(modalData.id, modalData.amount);
                                        } else {
                                            modalAction(modalData.id);
                                        }
                                    }
                                    setShowModal(false);
                                }}
                                className="bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Confirmar
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-400 transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAdjustStockModal && adjustingProduct && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Ajustar Estoque de {adjustingProduct.name}</h3>
                        <div className="space-y-4">
                            <p className="text-gray-700">Estoque Atual: <span className="font-semibold">{adjustingProduct.stock}</span></p>
                            <div>
                                <label htmlFor="stockAdjustmentType" className="block text-gray-700 text-sm font-semibold mb-2">Tipo de Ajuste:</label>
                                <select
                                    id="stockAdjustmentType"
                                    value={stockAdjustmentType}
                                    onChange={(e) => setStockAdjustmentType(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                                >
                                    <option value="entrada">Entrada (Aumento)</option>
                                    <option value="saida">Saída (Redução)</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="stockAdjustmentQuantity" className="block text-gray-700 text-sm font-semibold mb-2">Quantidade:</label>
                                <input
                                    type="number"
                                    id="stockAdjustmentQuantity"
                                    placeholder="Quantidade do ajuste"
                                    value={stockAdjustmentQuantity}
                                    onChange={(e) => setStockAdjustmentQuantity(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />
                            </div>
                            <div>
                                <label htmlFor="stockAdjustmentReason" className="block text-gray-700 text-sm font-semibold mb-2">Motivo:</label>
                                <textarea
                                    id="stockAdjustmentReason"
                                    placeholder="Ex: Recebimento de fornecedor, devolução, perda, etc."
                                    value={stockAdjustmentReason}
                                    onChange={(e) => setStockAdjustmentReason(e.target.value)}
                                    rows={3}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={handleStockAdjustment}
                                    className="bg-purple-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-purple-600 transition duration-300 ease-in-out transform hover:scale-105"
                                >
                                    Confirmar Ajuste
                                </button>
                                <button
                                    onClick={() => setShowAdjustStockModal(false)}
                                    className="bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-400 transition duration-300 ease-in-out transform hover:scale-105"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}