import { X } from 'lucide-react';
export default function Modal({ title, open, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onMouseDown={onClose}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onMouseDown={e=>e.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4"><h2 className="text-lg font-black">{title}</h2><button onClick={onClose} className="rounded-lg p-2 hover:bg-zinc-100"><X size={20}/></button></div><div className="p-6">{children}</div></div></div>;
}