import { MessageCircle, PhoneCall, AlertTriangle, Send, Mic, Heart } from "lucide-react";
import { AlertTimeline } from "../AlertTimeline";
import type { DemoSnapshot, UserProfile } from "../../types";

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string; }) {
  return (
    <div className="mb-6 border-b border-gold-600/20 pb-4">
      <p className="text-sm font-medium text-gold-500 uppercase tracking-widest">{eyebrow}</p>
      <h2 className="mt-1 text-2xl font-bold text-gold-400" style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-gold-200/60">{description}</p>
    </div>
  );
}

export function FamilyInteractionView({ snapshot, profile }: { snapshot: DemoSnapshot; profile: UserProfile }) {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Interaction Panel */}
        <section className="space-y-8">
          <div>
            <SectionHeader eyebrow="Family Care" title="亲情连线" description="与长辈保持实时沟通，远在千里也能随时传递关爱。" />
            <div className="bg-mist/50 border border-gold-600/30 rounded-2xl p-6 shadow-soft">
              <div className="flex flex-col h-[400px]">
                {/* Chat History Mock */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                  <div className="flex justify-center mb-4">
                    <span className="text-xs text-gold-200/40 bg-dark-bg/50 px-3 py-1 rounded-full">今天 10:23</span>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-dark-bg border border-gold-600/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] shadow-sm">
                      <p className="text-gold-100 text-sm">护腰提示：设备已成功佩戴，今日步态评分85分，状态良好。</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-dark-bg border border-gold-600/20 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] shadow-sm flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gold-900/30 flex items-center justify-center">
                        <Mic className="w-4 h-4 text-gold-500" />
                      </div>
                      <span className="text-gold-200 text-sm">语音留言 12"</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gold-gradient text-mist rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] shadow-gold">
                      <p className="text-sm font-medium">收到啦，妈您今天多注意休息，晚点给您打电话。</p>
                    </div>
                  </div>
                </div>
                
                {/* Input Area */}
                <div className="pt-4 border-t border-gold-600/20 flex gap-3">
                  <button className="p-3 rounded-full bg-dark-bg border border-gold-500/30 text-gold-500 hover:bg-gold-900/20 transition-colors">
                    <Mic className="w-5 h-5" />
                  </button>
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      placeholder="发送关爱提醒..." 
                      className="w-full bg-dark-bg border border-gold-600/30 rounded-full py-3 pl-4 pr-12 text-gold-100 focus:outline-none focus:border-gold-500 placeholder:text-gold-100/30"
                    />
                    <button className="absolute right-2 top-2 p-1.5 rounded-full bg-gold-gradient text-mist">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center gap-3 bg-dark-card border border-gold-600/30 p-6 rounded-2xl hover:border-gold-500/60 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-mist/50 flex items-center justify-center group-hover:bg-gold-gradient group-hover:text-mist text-gold-400 transition-colors shadow-soft">
                <PhoneCall className="w-6 h-6" />
              </div>
              <span className="text-gold-200 font-medium tracking-wider">紧急呼叫</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-3 bg-dark-card border border-gold-600/30 p-6 rounded-2xl hover:border-gold-500/60 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-mist/50 flex items-center justify-center group-hover:bg-gold-gradient group-hover:text-mist text-gold-400 transition-colors shadow-soft">
                <Heart className="w-6 h-6" />
              </div>
              <span className="text-gold-200 font-medium tracking-wider">健康提醒</span>
            </button>
          </div>
        </section>

        {/* Alerts Timeline */}
        <section>
          <SectionHeader eyebrow="Alerts" title="异常预警与记录" description="智能护腰检测到的异常情况与处理状态记录。" />
          <div className="bg-mist/30 border border-gold-600/20 rounded-2xl p-4 shadow-soft">
            <AlertTimeline events={snapshot.events} />
          </div>
        </section>
      </div>
    </div>
  );
}
