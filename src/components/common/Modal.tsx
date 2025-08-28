
interface ModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
}

export default function Modal({ show, onClose, onConfirm, message }: ModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Confirmar Ação</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            className="bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105"
          >
            Confirmar
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-400 transition duration-300 ease-in-out transform hover:scale-105"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}