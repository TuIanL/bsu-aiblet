import { Shield, Sparkles, Crown, Heart, Leaf, Activity } from "lucide-react";

export function ProductDetailsView() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Hero Section */}
      <div className="relative rounded-2xl border border-gold-600/40 bg-dark-card p-10 lg:p-16 overflow-hidden shadow-gold">
        <div className="absolute top-0 left-0 w-full h-1 bg-gold-gradient opacity-70" />
        
        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-900/20 text-gold-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" /> 皮诺曹护腰产业升级引领者
          </div>
          <h2 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gold-gradient mb-6" style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>
            安行护腰
          </h2>
          <p className="text-xl text-gold-200/80 tracking-widest max-w-2xl mx-auto">
            融合传统玉石康养理念与现代柔性传感技术，为父母打造看得见、摸得着的贴身守护。
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          {[
            { title: "数字护腰", desc: "TENG柔性传感与数字化结合，实时记录全流程关键数据", icon: Activity },
            { title: "玉智创分析", desc: "AI步态特征识别，结合14天基线预测最优护腰方案", icon: Sparkles },
            { title: "高端定制设计", desc: "基于99万+人体腰部数据模型，实现0.1毫米级精准贴合", icon: Crown },
          ].map((item, idx) => (
            <div key={idx} className="relative group p-8 rounded-xl border border-gold-600/20 bg-mist/60 hover:border-gold-500/50 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gold-gradient opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="w-14 h-14 rounded-full bg-dark-bg border border-gold-500/30 flex items-center justify-center mb-6 shadow-gold">
                <item.icon className="h-7 w-7 text-gold-400" />
              </div>
              <h3 className="text-2xl font-bold text-gold-300 mb-3" style={{ fontFamily: "'STKaiti', 'KaiTi', serif" }}>{item.title}</h3>
              <p className="text-gold-100/70 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sustainable & Tech Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-gold-600/30 bg-dark-card p-8 shadow-soft relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-6">
            <Leaf className="w-6 h-6 text-gold-500" />
            <h3 className="text-2xl font-semibold text-gold-400">社会价值与可持续发展</h3>
          </div>
          <div className="space-y-6">
            <div className="pl-4 border-l-2 border-gold-600/30 relative">
              <div className="absolute w-3 h-3 bg-gold-500 rounded-full -left-[7px] top-1.5 shadow-gold" />
              <p className="text-gold-200 font-bold mb-1">推动传统工艺数字化转型</p>
              <p className="text-gold-100/60 text-sm">将不可见的照护需求转化为直观的数字看板，提升照护质量与家庭幸福感。</p>
            </div>
            <div className="pl-4 border-l-2 border-gold-600/30 relative">
              <div className="absolute w-3 h-3 bg-gold-500 rounded-full -left-[7px] top-1.5 shadow-gold" />
              <p className="text-gold-200 font-bold mb-1">文化传承与科技创新</p>
              <p className="text-gold-100/60 text-sm">以现代科技弘扬中华孝道文化，吸引年轻一代关注父母居家健康。</p>
            </div>
            <div className="pl-4 border-l-2 border-transparent relative">
              <div className="absolute w-3 h-3 bg-gold-500 rounded-full -left-[7px] top-1.5 shadow-gold" />
              <p className="text-gold-200 font-bold mb-1">环保可回收材料</p>
              <p className="text-gold-100/60 text-sm">护腰核心结构采用环保可持续材料，严格控制生产工艺参数，保证产品寿命与环境友好。</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gold-600/30 bg-dark-card p-8 shadow-soft relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-gold-500/5 rounded-full blur-3xl" />
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-6 h-6 text-gold-500" />
            <h3 className="text-2xl font-semibold text-gold-400">核心技术参数</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "毫秒级", value: "延时响应" },
              { label: "99.9%", value: "跌倒识别率" },
              { label: "±2.1%", value: "误差控制" },
              { label: "7天x24h", value: "超长续航" },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-mist/40 border border-gold-600/20 rounded-lg text-center">
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gold-gradient mb-1">{stat.label}</p>
                <p className="text-gold-200/70 text-sm">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
