import { CustomHeader } from '../../types';

interface CustomHeaderInputProps {
  header: CustomHeader;
  onKeyChange: (value: string) => void;
  onValueChange: (value: string) => void;
  readOnly?: boolean;
}

function CustomHeaderInput({ header, onKeyChange, onValueChange, readOnly = false }: CustomHeaderInputProps) {
  return (
    <div className="flex-1 grid grid-cols-2 gap-2">
      <input
        type="text"
        value={header.key}
        onChange={(e) => onKeyChange(e.target.value)}
        placeholder="Header name"
        className={`bg-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none ${!readOnly ? 'focus:ring-2 focus:ring-blue-500' : ''}`}
        readOnly={readOnly}
      />
      <input
        type="text"
        value={header.value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Header value"
        className={`bg-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none ${!readOnly ? 'focus:ring-2 focus:ring-blue-500' : ''}`}
        readOnly={readOnly}
      />
    </div>
  );
}

export default CustomHeaderInput;