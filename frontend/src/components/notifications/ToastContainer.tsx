import { AlertCircle, CheckCircle, Info, Loader, X } from 'lucide-react';
import { useContext } from 'react';
import { ToastContext } from './ToastContext';

function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 min-w-[320px] max-w-[420px]">
      {toasts.map((toast) => {
        const icons = {
          info: <Info className="w-5 h-5 text-blue-400" />,
          success: <CheckCircle className="w-5 h-5 text-green-400" />,
          error: <AlertCircle className="w-5 h-5 text-red-400" />,
          loading: <Loader className="w-5 h-5 text-blue-400 animate-spin" />,
        };

        return (
          <div
            key={toast.id}
            className="bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-all ease-in-out opacity-100"
          >
            {/* Toast Content */}
            <div className="p-4">
              <div className="flex items-start justify-between space-x-3">
                <div className="flex-shrink-0">{icons[toast.type]}</div>
                <div className="flex-1 pt-0.5">
                  <h3 className="font-medium text-gray-100">{toast.title}</h3>
                  {toast.message && (
                    <p className="mt-1 text-sm text-gray-300">{toast.message}</p>
                  )}
                </div>
                {/* Close Button */}
                <button
                  className="text-gray-400 hover:text-gray-100 focus:outline-none"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close toast"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {toast.duration != 0 && (
              <div className="h-1 bg-gray-700 relative">
                <div
                  className="absolute top-0 right-0 h-full"
                  style={{
                    backgroundColor:
                      toast.type === 'error'
                        ? 'rgb(239 68 68)' // Tailwind's `bg-red-500`
                        : toast.type === 'success'
                        ? 'rgb(34 197 94)' // Tailwind's `bg-green-500`
                        : 'rgb(59 130 246)', // Tailwind's `bg-blue-500`
                    width: '100%',
                    animation: `shrink ${toast.duration}ms linear`,
                  }}
                  onAnimationEnd={() => removeToast(toast.id)}
                />
              </div>
            )}
          </div>
        );
      })}
      {/* Add the keyframes for the shrink animation */}
      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default ToastContainer;
