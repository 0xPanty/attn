import { X } from 'lucide-react';
import type { Language } from '@/types';

const STEPS: Record<Language, { icon: string; label: string; desc: string }[]> = {
  en: [
    { icon: '📡', label: 'Ingest', desc: 'Trending + vertical channels, every 3 hours' },
    { icon: '🧹', label: 'Filter', desc: 'Content density, time decay, author credibility' },
    { icon: '🧠', label: 'Score', desc: 'LLM rates information density 1\u201310. Threshold: 7+' },
    { icon: '👥', label: 'Verify', desc: 'KOL confirmation + community cross-reference' },
    { icon: '🚦', label: 'Classify', desc: 'Assign heat: Red / Yellow / Green' },
    { icon: '📦', label: 'Output', desc: 'Compress, translate, cache \u2014 zero latency' },
  ],
  zh: [
    { icon: '📡', label: '\u91c7\u96c6', desc: '\u70ed\u95e8 + \u5782\u76f4\u9891\u9053\uff0c\u6bcf 3 \u5c0f\u65f6\u4e00\u8f6e' },
    { icon: '🧹', label: '\u8fc7\u6ee4', desc: '\u5185\u5bb9\u5bc6\u5ea6\u3001\u65f6\u95f4\u8870\u51cf\u3001\u4f5c\u8005\u53ef\u4fe1\u5ea6' },
    { icon: '🧠', label: '\u8bc4\u5206', desc: 'LLM \u4fe1\u606f\u5bc6\u5ea6\u6253\u5206 1\u201310\uff0c\u95e8\u69db 7+' },
    { icon: '👥', label: '\u9a8c\u8bc1', desc: 'KOL \u786e\u8ba4 + \u793e\u533a\u4ea4\u53c9\u5f15\u7528' },
    { icon: '🚦', label: '\u5206\u7ea7', desc: '\u6807\u8bb0\u70ed\u5ea6\uff1a\u7ea2 / \u9ec4 / \u7eff' },
    { icon: '📦', label: '\u8f93\u51fa', desc: '\u538b\u7f29\u3001\u7ffb\u8bd1\u3001\u7f13\u5b58 \u2014 \u96f6\u5ef6\u8fdf' },
  ],
  ja: [
    { icon: '📡', label: '\u53ce\u96c6', desc: '\u30c8\u30ec\u30f3\u30c9 + \u5782\u76f4\u30c1\u30e3\u30f3\u30cd\u30eb\u30013\u6642\u9593\u3054\u3068' },
    { icon: '🧹', label: '\u30d5\u30a3\u30eb\u30bf', desc: '\u30b3\u30f3\u30c6\u30f3\u30c4\u5bc6\u5ea6\u30fb\u6642\u9593\u6e1b\u8870\u30fb\u8457\u8005\u4fe1\u983c\u5ea6' },
    { icon: '🧠', label: '\u30b9\u30b3\u30a2', desc: 'LLM\u304c\u60c5\u5831\u5bc6\u5ea6\u30921-10\u3067\u63a1\u70b9\u3002\u95be\u5024: 7+' },
    { icon: '👥', label: '\u691c\u8a3c', desc: 'KOL\u78ba\u8a8d + \u30b3\u30df\u30e5\u30cb\u30c6\u30a3\u76f8\u4e92\u53c2\u7167' },
    { icon: '🚦', label: '\u5206\u985e', desc: '\u30d2\u30fc\u30c8\u4ed8\u4e0e: \u8d64 / \u9ec4 / \u7dd1' },
    { icon: '📦', label: '\u51fa\u529b', desc: '\u5727\u7e2e\u30fb\u7ffb\u8a33\u30fb\u30ad\u30e3\u30c3\u30b7\u30e5 \u2014 \u30bc\u30ed\u30ec\u30a4\u30c6\u30f3\u30b7' },
  ],
  ko: [
    { icon: '📡', label: '\uc218\uc9d1', desc: '\ud2b8\ub80c\ub529 + \uc218\uc9c1 \ucc44\ub110, 3\uc2dc\uac04\ub9c8\ub2e4' },
    { icon: '🧹', label: '\ud544\ud130', desc: '\ucf58\ud150\uce20 \ubc00\ub3c4, \uc2dc\uac04 \uac10\uc1e0, \uc800\uc790 \uc2e0\ub8b0\ub3c4' },
    { icon: '🧠', label: '\uc2a4\ucf54\uc5b4', desc: 'LLM \uc815\ubcf4 \ubc00\ub3c4 1-10 \ucc44\uc810. \uc784\uacc4\uac12: 7+' },
    { icon: '👥', label: '\uac80\uc99d', desc: 'KOL \ud655\uc778 + \ucee4\ubba4\ub2c8\ud2f0 \uad50\ucc28 \ucc38\uc870' },
    { icon: '🚦', label: '\ubd84\ub958', desc: '\ud788\ud2b8 \ubd80\uc5ec: \ube68\uac15 / \ub178\ub791 / \ucd08\ub85d' },
    { icon: '📦', label: '\ucd9c\ub825', desc: '\uc555\ucd95, \ubc88\uc5ed, \uce90\uc2dc \u2014 \uc81c\ub85c \ub808\uc774\ud134\uc2dc' },
  ],
  fa: [
    { icon: '📡', label: '\u062c\u0645\u0639\u200c\u0622\u0648\u0631\u06cc', desc: '\u062a\u0631\u0646\u062f + \u06a9\u0627\u0646\u0627\u0644\u200c\u0647\u0627\u06cc \u062a\u062e\u0635\u0635\u06cc\u060c \u0647\u0631 \u06f3 \u0633\u0627\u0639\u062a' },
    { icon: '🧹', label: '\u0641\u06cc\u0644\u062a\u0631', desc: '\u062a\u0631\u0627\u06a9\u0645 \u0645\u062d\u062a\u0648\u0627\u060c \u06a9\u0627\u0647\u0634 \u0632\u0645\u0627\u0646\u06cc\u060c \u0627\u0639\u062a\u0628\u0627\u0631 \u0646\u0648\u06cc\u0633\u0646\u062f\u0647' },
    { icon: '🧠', label: '\u0627\u0645\u062a\u06cc\u0627\u0632', desc: '\u0647\u0648\u0634 \u0645\u0635\u0646\u0648\u0639\u06cc \u062a\u0631\u0627\u06a9\u0645 \u0627\u0637\u0644\u0627\u0639\u0627\u062a \u06f1-\u06f1\u06f0. \u0622\u0633\u062a\u0627\u0646\u0647: \u06f7+' },
    { icon: '👥', label: '\u062a\u0623\u06cc\u06cc\u062f', desc: '\u062a\u0623\u06cc\u06cc\u062f KOL + \u0627\u0631\u062c\u0627\u0639 \u0645\u062a\u0642\u0627\u0628\u0644 \u062c\u0627\u0645\u0639\u0647' },
    { icon: '🚦', label: '\u0637\u0628\u0642\u0647\u200c\u0628\u0646\u062f\u06cc', desc: '\u0633\u06cc\u06af\u0646\u0627\u0644: \u0642\u0631\u0645\u0632 / \u0632\u0631\u062f / \u0633\u0628\u0632' },
    { icon: '📦', label: '\u062e\u0631\u0648\u062c\u06cc', desc: '\u0641\u0634\u0631\u062f\u0647\u200c\u0633\u0627\u0632\u06cc\u060c \u062a\u0631\u062c\u0645\u0647\u060c \u06a9\u0634 \u2014 \u0628\u062f\u0648\u0646 \u062a\u0623\u062e\u06cc\u0631' },
  ],
};

const HEAT_LEGEND: Record<Language, [string, string, string]> = {
  en: ['Security events \u2014 verified by KOL + community', 'Major announcements & breaking news', 'Quality insights & technical analysis'],
  zh: ['\u5b89\u5168\u4e8b\u4ef6 \u2014 \u7ecf KOL + \u793e\u533a\u9a8c\u8bc1', '\u91cd\u5927\u516c\u544a\u4e0e\u7a81\u53d1\u65b0\u95fb', '\u9ad8\u8d28\u91cf\u6d1e\u5bdf\u4e0e\u6280\u672f\u5206\u6790'],
  ja: ['\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3\u4e8b\u4ef6 \u2014 KOL+\u30b3\u30df\u30e5\u30cb\u30c6\u30a3\u691c\u8a3c\u6e08', '\u91cd\u8981\u767a\u8868\u30fb\u901f\u5831', '\u9ad8\u54c1\u8cea\u306a\u6d1e\u5bdf\u30fb\u6280\u8853\u5206\u6790'],
  ko: ['\ubcf4\uc548 \uc0ac\uac74 \u2014 KOL + \ucee4\ubba4\ub2c8\ud2f0 \uac80\uc99d', '\uc8fc\uc694 \ubc1c\ud45c \ubc0f \uc18d\ubcf4', '\uace0\ud488\uc9c8 \uc778\uc0ac\uc774\ud2b8 \ubc0f \uae30\uc220 \ubd84\uc11d'],
  fa: ['\u062d\u0648\u0627\u062f\u062b \u0627\u0645\u0646\u06cc\u062a\u06cc \u2014 \u062a\u0623\u06cc\u06cc\u062f KOL + \u062c\u0627\u0645\u0639\u0647', '\u0627\u0639\u0644\u0627\u0645\u06cc\u0647\u200c\u0647\u0627\u06cc \u0645\u0647\u0645 \u0648 \u0627\u062e\u0628\u0627\u0631 \u0641\u0648\u0631\u06cc', '\u0628\u06cc\u0646\u0634 \u0628\u0627\u06a9\u06cc\u0641\u06cc\u062a \u0648 \u062a\u062d\u0644\u06cc\u0644 \u0641\u0646\u06cc'],
};

const TITLES: Record<Language, string> = {
  en: 'Pipeline',
  zh: '\u5904\u7406\u7ba1\u7ebf',
  ja: '\u30d1\u30a4\u30d7\u30e9\u30a4\u30f3',
  ko: '\ud30c\uc774\ud504\ub77c\uc778',
  fa: '\u062e\u0637 \u067e\u0631\u062f\u0627\u0632\u0634',
};

interface InfoPanelProps {
  language: Language;
  onClose: () => void;
}

export function InfoPanel({ language, onClose }: InfoPanelProps) {
  const steps = STEPS[language] || STEPS.en;
  const heat = HEAT_LEGEND[language] || HEAT_LEGEND.en;
  const title = TITLES[language] || TITLES.en;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <span className="text-[11px] font-mono font-medium text-white/50 uppercase tracking-[0.15em]">{title}</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {/* Flow */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-[18px] bottom-[18px] w-px border-l border-dashed border-white/[0.08]" />

            <div className="space-y-3.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3.5 relative">
                  <div className="w-[30px] h-[30px] rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-sm shrink-0 relative z-10">
                    {step.icon}
                  </div>
                  <div className="pt-0.5 min-w-0">
                    <span className="text-[11px] font-mono font-medium text-white/50 uppercase tracking-wider">{step.label}</span>
                    <p className="text-[12px] text-white/30 leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Heat legend */}
          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="space-y-2">
              {[
                { color: 'bg-red-500', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]', text: heat[0] },
                { color: 'bg-yellow-500', glow: '', text: heat[1] },
                { color: 'bg-green-500', glow: '', text: heat[2] },
              ].map((h, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${h.color} ${h.glow} mt-[5px] shrink-0`} />
                  <span className="text-[12px] text-white/30 leading-relaxed">{h.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
