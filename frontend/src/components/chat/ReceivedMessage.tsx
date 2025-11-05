import { memo } from "react";
import { ChatMessage } from "../../types";

export default memo(function ReceivedMessage({ msg }: { 
    msg: ChatMessage 
}) {
  return (
    <div className="flex items-start space-x-3 pr-10">
      <img src={msg.user.avatar} alt={msg.user.name} className="w-8 h-8 rounded-full" />
      <div>
        <div className="flex items-center space-x-2">
          <span className="font-medium">{msg.user.name}</span>
          <span className="text-xs text-gray-400">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-gray-300">{msg.message}</p>
      </div>
    </div>
  );
});