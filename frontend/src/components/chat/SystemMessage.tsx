import { memo } from "react";
import { ChatMessage } from "../../types";

export default memo(function SystemMessage({ msg }: { 
    msg: ChatMessage 
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="ml-11">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-blue-400">{msg.message}</p>
      </div>
    </div>
  );
});