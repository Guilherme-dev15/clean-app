// src/components/Message.tsx
interface MessageProps {
  text: string;
  type: string;
}

export default function Message({ text, type }: MessageProps) {
  return (
    <div className={`p-3 mb-4 rounded-lg text-white font-semibold text-center ${type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
      {text}
    </div>
  );
}