// src/components/common/ProductHistoryModal.tsx
import { useState, useEffect } from 'react';
// CORREÇÃO: O caminho de importação foi ajustado para garantir a resolução correta do módulo.
import { useApp } from '../AppContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { StockMovement } from '../../types';

interface ProductHistoryModalProps {
  productId: string;
  productName: string;
  onClose: () => void;
}

export default function ProductHistoryModal({ productId, productName, onClose }: ProductHistoryModalProps) {
  const { db, userId, appId, showTemporaryMessage } = useApp();
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;

    const movementsRef = collection(db, `artifacts/${appId}/users/${userId}/stock_movements`);
    const q = query(
      movementsRef,
      where('productId', '==', productId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const movementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMovement));
      setHistory(movementsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao carregar histórico do produto:", error);
      showTemporaryMessage("Erro ao carregar histórico do produto.", "error");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, userId, appId, productId, showTemporaryMessage]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Histórico de Movimentação - {productName}</h3>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p>A carregar histórico...</p>
          ) : history.length === 0 ? (
            <p>Nenhuma movimentação encontrada para este produto.</p>
          ) : (
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left">Data</th>
                  <th className="py-2 px-4 text-left">Tipo</th>
                  <th className="py-2 px-4 text-right">Quantidade</th>
                  <th className="py-2 px-4 text-left">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {history.map(move => (
                  <tr key={move.id} className="border-b">
                    <td className="py-2 px-4">{new Date(move.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        move.type === 'Venda' || move.type === 'Ajuste de Saída' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {move.type}
                      </span>
                    </td>
                    <td className={`py-2 px-4 text-right font-bold ${
                        move.type === 'Venda' || move.type === 'Ajuste de Saída' ? 'text-red-600' : 'text-green-600'
                      }`}>
                      {move.type === 'Venda' || move.type === 'Ajuste de Saída' ? '-' : '+'}{move.quantity}
                    </td>
                    <td className="py-2 px-4 text-sm text-gray-600">{move.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
