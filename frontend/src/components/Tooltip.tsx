import { Info } from 'lucide-react';

interface TooltipProps {
  content: React.ReactNode;
}

export function Tooltip({ content }: TooltipProps) {
  return (
    <div className="group relative inline-flex items-center">
      <Info className="w-4 h-4 text-blue-400 cursor-help" />
      <div className="absolute left-0 bottom-full mb-2 w-96 bg-gray-900 p-3 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {content}
        <div className="absolute left-1 bottom-[-6px] w-3 h-3 bg-gray-900 transform rotate-45"></div>
      </div>
    </div>
  );
}

export const ModeTooltipContent = () => (
  <div className="space-y-3 text-sm">
    <div>
      <span className="font-semibold text-blue-400">Direct</span>
      <p>Directly uses the source stream. Won't work with most of the streams, because of CORS, IP/Device restrictions. Is also incompatible with custom headers and privacy mode.</p>
    </div>
    <div>
      <span className="font-semibold text-blue-400">Proxy</span>
      <p>The stream requests are proxied through the backend. Allows to set custom headers and bypass CORS. This mode is preffered. Only switch to restream mode, if proxy mode won't work for your stream or if you have synchronization issues.</p>
    </div>
    <div>
      <span className="font-semibold text-blue-400">Restream</span>
      <p>The backend service caches the source stream (with ffmpeg) and restreams it. Can help with hard device restrictions of your provider. But it can lead to long initial loading times and performance issues after time.</p>
    </div>
  </div>
);