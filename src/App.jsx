import React, { useState, useEffect } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion
} from 'lucide-react';

// --- Firebase 整合配置區 ---
// 我們直接使用 CDN 導入，確保在所有環境都能穩定運行
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// ⚠️ 重要：請在此處填入您在 Firebase 網頁後台拿到的 Config 設定
const firebaseConfig = {
  apiKey: "AIzaSyCeHj5Kc6E_ltyXboL7cWSpFClq4FrCrvU",
  authDomain: "commission-hub-cc739.firebaseapp.com",
  projectId: "commission-hub-cc739",
  storageBucket: "commission-hub-cc739.firebasestorage.app",
  messagingSenderId: "1022991297741",
  appId: "1:1022991297741:web:df716fcd268c0d9d2c8d84"

};

// 初始化連線
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const GlobalAnnouncement = "🌊 介面升級：全新的「方框式」導引設計，讓操作流程更清晰！";

const PAYMENT_STATUS = {
  none: { label: '未付款', color: 'text-slate-400', bg: 'bg-slate-100', icon: Wallet },
  deposit: { label: '已付訂金', color: 'text-amber-500', bg: 'bg-amber-50', icon: CreditCard },
  full: { label: '已全額付清', color: 'text-emerald-500', bg: 'bg-emerald-50', icon: ShieldCheck },
};

// --- 主應用程式 ---
const App = () => {
  const [view, setView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [commissions, setCommissions] = useState([]); 
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  // 監聽雲端資料庫變化
  useEffect(() => {
    try {
      const q = query(collection(db, "commissions"), orderBy("updatedAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setCommissions(data);
        setLoading(false);
      }, (error) => {
        console.error("Firebase Error:", error);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Init Error:", err);
      setLoading(false);
    }
  }, []);

  const handleLogin = (role, data) => {
    if (role === 'artist') {
      if (data.password === 'admin') { 
        setView('artist');
      } else {
        showNotification('密碼錯誤', 'error');
      }
    } else if (role === 'client') {
      const target = commissions.find(c => c.name === data.name && c.code === data.code && c.status !== 'pending');
      if (target) {
        setCurrentUser(target);
        setView('client');
      } else {
        showNotification('找不到資料，或委託尚未被受理', 'error');
      }
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleNewRequest = async (requestData) => {
    try {
      const newCommission = {
        ...requestData,
        code: 'PENDING',
        status: 'pending',
        note: '您的委託已成功送出，請等待繪師聯繫與審核。',
        items: {
          avatar: { active: requestData.type === 'avatar', progress: 0, price: 0, payment: 'none', preview: '' },
          halfBody: { active: requestData.type === 'halfBody', progress: 0, price: 0, payment: 'none', preview: '' },
          fullBody: { active: requestData.type === 'fullBody', progress: 0, price: 0, payment: 'none', preview: '' },
        },
        timeline: [
          { date: new Date().toISOString().split('T')[0], title: '提出申請', desc: '已提交線上委託申請單。' }
        ],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      await addDoc(collection(db, "commissions"), newCommission);
      showNotification('委託申請已送出！');
    } catch (e) {
      showNotification('申請失敗: ' + e.message, 'error');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-blue-600 font-bold animate-pulse text-sm tracking-widest uppercase">Database Connecting</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-sky-200 selection:text-blue-900">
      {/* 注入自定義樣式 */}
      <style>{styles}</style>
      
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 backdrop-blur-md border ${notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-600' : 'bg-emerald-50/90 border-emerald-200 text-emerald-600'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold">{notification.msg}</span>
        </div>
      )}

      {view === 'login' && <LoginView onLogin={handleLogin} onRequest={handleNewRequest} />}
      
      {view === 'client' && (
        <ClientDashboard 
          user={currentUser} 
          data={commissions.find(c => c.id === currentUser.id)}
          onLogout={() => { setView('login'); setCurrentUser(null); }} 
        />
      )}
      
      {view === 'artist' && (
        <ArtistDashboard 
          commissions={commissions} 
          notify={showNotification}
          onLogout={() => setView('login')}
        />
      )}
    </div>
  );
};

// --- 1. 登入介面 (方框強化版) ---
const LoginView = ({ onLogin, onRequest }) => {
  const [activeTab, setActiveTab] = useState('client');
  const [formData, setFormData] = useState({ name: '', code: '', password: '' });
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* 背景裝飾 */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-300/10 rounded-full blur-[140px]"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 backdrop-blur-2xl border border-white rounded-[3rem] shadow-2xl shadow-blue-900/5 overflow-hidden">
          <div className="pt-12 pb-8 px-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 transform rotate-6 hover:rotate-0 transition-transform duration-500">
              <Palette size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Commission<span className="text-blue-500">Hub</span></h1>
            <p className="text-slate-400 text-xs font-bold mt-2 tracking-widest uppercase opacity-70">Cloud Database Service</p>
          </div>

          <div className="flex p-1.5 mx-8 bg-slate-100/50 rounded-[1.5rem] mb-10 border border-slate-200/50">
            <button onClick={() => setActiveTab('client')} className={`flex-1 py-3.5 rounded-2xl text-sm font-black transition-all ${activeTab === 'client' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400'}`}>委託查詢</button>
            <button onClick={() => setActiveTab('artist')} className={`flex-1 py-3.5 rounded-2xl text-sm font-black transition-all ${activeTab === 'artist' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400'}`}>繪師後台</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onLogin(activeTab, formData); }} className="px-8 pb-10 space-y-8">
            {activeTab === 'client' ? (
              <>
                {/* 您圖中圈起來的部分：改為清晰的方框 */}
                <div className="input-group">
                  <label className="label">委託人名稱 (暱稱)</label>
                  <input required type="text" placeholder="請輸入您的名稱" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="label">專屬查詢編號</label>
                  <input required type="text" placeholder="例如：STAR01" className="input-field" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                </div>
              </>
            ) : (
              <div className="input-group">
                <label className="label">管理密碼</label>
                <input required type="password" placeholder="請輸入密碼" className="input-field" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            )}
            <button type="submit" className="w-full py-5 rounded-[1.5rem] font-black text-white shadow-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 active:scale-[0.98] transition-all tracking-widest">
              {activeTab === 'client' ? '登入並查詢進度' : '進入管理後台'}
            </button>
          </form>

          {activeTab === 'client' && (
            <div className="px-8 pb-12">
              <div className="relative flex py-6 items-center">
                <div className="flex-grow border-t border-slate-200 opacity-50"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-[10px] font-black tracking-widest uppercase">New Commission?</span>
                <div className="flex-grow border-t border-slate-200 opacity-50"></div>
              </div>
              <button 
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full py-4 rounded-[1.5rem] font-black text-pink-500 border-2 border-pink-100 bg-pink-50/30 hover:bg-pink-50 hover:border-pink-200 transition-all flex items-center justify-center gap-3"
              >
                <Sparkles size={18} /> ✨ 我要發起委託
              </button>
            </div>
          )}
        </div>
      </div>

      {isRequestModalOpen && (
        <RequestModal onClose={() => setIsRequestModalOpen(false)} onSubmit={onRequest} />
      )}
    </div>
  );
};

// --- 委託申請表單 (方框強化版) ---
const RequestModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', contact: '', type: 'avatar', desc: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 my-8 border border-white">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 bg-pink-100 text-pink-500 rounded-2xl flex items-center justify-center"><Mail size={20} /></div>
            發起新委託
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="input-group">
            <label className="label">如何稱呼您</label>
            <input required type="text" className="input-field" placeholder="請輸入暱稱" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="label">聯絡方式</label>
            <input required type="text" className="input-field" placeholder="Email / Discord / Social Media" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="label">委託類別</label>
            <select className="input-field cursor-pointer" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="avatar">大頭貼 / Avatar</option>
              <option value="halfBody">半身插畫 / Half Body</option>
              <option value="fullBody">全身立繪 / Full Body</option>
            </select>
          </div>
          <div className="input-group">
            <label className="label">需求描述</label>
            <textarea className="input-field resize-none h-32" placeholder="請大致描述您的委託需求..." value={form.desc} onChange={e => setForm({...form, desc: e.target.value})}></textarea>
          </div>
          <button type="submit" className="w-full py-5 bg-pink-500 text-white font-black rounded-2xl hover:bg-pink-600 transition-all shadow-xl shadow-pink-200 mt-4 flex items-center justify-center gap-2">
            <Send size={20} /> 送出委託申請單
          </button>
        </form>
      </div>
    </div>
  );
};

// --- 2. 委託人儀表板 ---
const ClientDashboard = ({ user, data, onLogout }) => {
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black mb-2">讀取失敗</h2>
            <p className="text-slate-400 text-sm mb-6">資料可能已被刪除或路徑錯誤</p>
            <button onClick={onLogout} className="px-6 py-2 bg-slate-100 rounded-xl font-bold">返回登入</button>
        </div>
    </div>
  );

  const activeItems = Object.entries(data.items).filter(([_, item]) => item.active);
  const [activeTab, setActiveTab] = useState(activeItems.length > 0 ? activeItems[0][0] : null);
  const tabLabels = { avatar: '大頭貼', halfBody: '半身插畫', fullBody: '全身立繪' };
  const tabIcons = { avatar: User, halfBody: ImageIcon, fullBody: Activity };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Palette size={20} />
            </div>
            <span className="font-black text-slate-800 tracking-tight text-lg">CommissionHub</span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-slate-500 hover:bg-slate-100 text-sm font-black transition-colors border border-transparent hover:border-slate-200">
            <LogOut size={16} /> 登出系統
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white p-5 rounded-[2.5rem] shadow-xl flex items-center gap-4 border border-white/20">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"><Sparkles size={20} /></div>
          <p className="text-sm font-bold tracking-tight">{GlobalAnnouncement}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
               <div className="relative z-10">
                 <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">Hi, {data.name}</h1>
                 <p className="text-slate-400 font-bold text-sm mb-6 opacity-80">您的專屬委託進度追蹤</p>
                 <StatusBadge status={data.status} />
               </div>
               <div className="absolute right-[-60px] top-[-60px] w-72 h-72 bg-blue-50 rounded-full blur-[120px] opacity-40"></div>
            </div>

            {activeItems.length > 0 ? (
              <div className="bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 border border-slate-100 overflow-hidden min-h-[550px]">
                <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/30">
                  {activeItems.map(([key, _]) => (
                    <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 py-6 px-6 font-black text-sm flex items-center justify-center gap-3 whitespace-nowrap transition-all border-b-2 ${activeTab === key ? 'text-blue-600 border-blue-600 bg-white' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/50'}`}>
                      {React.createElement(tabIcons[key], { size: 18 })} {tabLabels[key]}
                    </button>
                  ))}
                </div>
                <div className="p-10 animate-in fade-in" key={activeTab}>
                   {(() => {
                     const currentItem = data.items[activeTab];
                     const statusInfo = PAYMENT_STATUS[currentItem.payment];
                     return (
                       <div className="space-y-12">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="input-group border-transparent bg-slate-50/80 p-6">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">委託金額</span>
                              <div className="flex items-center gap-2"><DollarSign size={20} className="text-slate-400"/><span className="text-3xl font-black text-slate-800">{currentItem.price.toLocaleString()}</span></div>
                           </div>
                           <div className={`input-group border-transparent p-6 ${statusInfo.bg}`}>
                              <span className={`text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block ${statusInfo.color}`}>付款狀態</span>
                              <div className={`flex items-center gap-3 font-black text-xl ${statusInfo.color}`}>{React.createElement(statusInfo.icon, { size: 24 })} {statusInfo.label}</div>
                           </div>
                         </div>
                         
                         <div className="input-group bg-slate-50/30 border-slate-200/50 p-8">
                            <span className="text-sm font-black text-slate-800 flex items-center gap-3 mb-6">
                              <Camera size={20} className="text-blue-500" /> 當前進度預覽
                            </span>
                            <div className="aspect-video w-full bg-white rounded-[2rem] overflow-hidden border border-slate-200 relative group shadow-2xl shadow-blue-900/5">
                              {currentItem.preview ? (
                                <>
                                  <img src={currentItem.preview} alt="Preview" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-8">
                                    <p className="text-white text-sm font-bold bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">僅供確認進度，嚴禁轉載</p>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                  <ImageIcon size={64} className="mb-4 opacity-10 animate-pulse" />
                                  <span className="text-xs font-black tracking-widest uppercase">Drawing in Progress</span>
                                </div>
                              )}
                            </div>
                         </div>

                         <div>
                           <div className="flex justify-between items-end mb-4 px-2">
                             <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Current Progress</span>
                             <span className="text-2xl font-black text-blue-600">{currentItem.progress}%</span>
                           </div>
                           <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden p-1.5 shadow-inner border border-slate-200/50">
                             <div className={`h-full rounded-full transition-all duration-1000 ${currentItem.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-sky-400'}`} style={{ width: `${currentItem.progress}%` }}></div>
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm"><p className="text-slate-400 font-black tracking-widest uppercase text-xs">No Active Projects Found</p></div>
            )}
          </div>
          
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-3 mb-6 text-blue-600">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0"><MessageCircle size={20} /></div>
                  <h3 className="font-black text-lg">繪師留言</h3>
               </div>
               <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 border border-slate-200/50 p-6 rounded-[2rem] italic shadow-inner">
                 「{data.note || "暫無特別留言。" }」
               </p>
            </div>
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
               <div className="flex items-center gap-3 mb-10 text-slate-800">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0"><History size={20} /></div>
                  <h3 className="font-black text-lg">活動日誌</h3>
               </div>
               <div className="relative pl-4 space-y-12">
                  <div className="absolute left-[23px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
                  {data.timeline && data.timeline.length > 0 ? data.timeline.map((event, idx) => (
                    <div key={idx} className="relative pl-12 animate-in slide-in-from-left-2">
                       <div className="absolute left-[18px] top-1 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-full z-10 shadow-md"></div>
                       <span className="text-[10px] font-black text-slate-300 block mb-2 tracking-tighter uppercase">{event.date}</span>
                       <h4 className="font-black text-slate-800 text-sm mb-1">{event.title}</h4>
                       <p className="text-xs text-slate-500 leading-relaxed font-medium">{event.desc}</p>
                    </div>
                  )) : <p className="text-slate-400 text-[10px] text-center font-black uppercase">Log is empty</p>}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- 3. 繪師後台 (方框編輯版) ---
const ArtistDashboard = ({ commissions, notify, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const pendingRequests = commissions.filter(c => c.status === 'pending');
  const activeCommissions = commissions.filter(c => c.status !== 'pending');

  const openModal = (item = null) => {
    setEditingItem(item ? JSON.parse(JSON.stringify(item)) : {
      name: '', code: '', status: 'waiting', note: '', contact: '',
      items: {
        avatar: { active: false, progress: 0, price: 0, payment: 'none', preview: '' },
        halfBody: { active: false, progress: 0, price: 0, payment: 'none', preview: '' },
        fullBody: { active: false, progress: 0, price: 0, payment: 'none', preview: '' },
      },
      timeline: [],
      updatedAt: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleSave = async (data) => {
    if (data.status !== 'pending' && (!data.code || data.code === 'PENDING')) {
        notify('請為此委託設定一個正式查詢編號', 'error');
        return;
    }
    try {
      const newTimelineEvent = { date: new Date().toISOString().split('T')[0], title: '系統更新', desc: '資料已由繪師端同步更新。' };
      const dataToSave = { ...data, timeline: [newTimelineEvent, ...(data.timeline || [])], updatedAt: new Date().toISOString().split('T')[0] };
      if (data.id) { await updateDoc(doc(db, "commissions", data.id), dataToSave); notify('雲端同步成功'); } 
      else { await addDoc(collection(db, "commissions"), dataToSave); notify('新委託建立成功'); }
      setIsModalOpen(false);
    } catch (e) { notify('儲存失敗', 'error'); }
  };

  const handleDelete = async (id) => {
    if (confirm('確定要永久刪除這筆資料嗎？')) {
      try { await deleteDoc(doc(db, "commissions", id)); notify('資料已刪除'); } 
      catch (e) { notify('刪除失敗', 'error'); }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white sticky top-0 z-40 px-6 py-5 shadow-2xl">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30"><LayoutGrid size={20} /></div><span className="font-black tracking-tighter text-xl">Artist Studio</span></div>
          <button onClick={onLogout} className="text-slate-400 hover:text-white font-black text-xs bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl transition-all hover:bg-white/10 uppercase tracking-widest">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">委託管理中心</h2>
          <button onClick={() => openModal()} className="bg-blue-600 text-white px-10 py-5 rounded-[1.5rem] font-black flex items-center gap-3 shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 transition-all active:translate-y-0 tracking-widest"><Plus size={20} /> 新增委託案</button>
        </div>

        {pendingRequests.length > 0 && (
          <div className="mb-20">
            <h3 className="text-xs font-black text-pink-500 mb-8 flex items-center gap-3 uppercase tracking-[0.2em]"><FileQuestion size={18} /> 待審核申請庫 ({pendingRequests.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pendingRequests.map(item => (
                    <div key={item.id} className="bg-white border-2 border-pink-100 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-pink-200/10 hover:border-pink-300 transition-all group">
                        <div className="absolute top-0 right-0 bg-pink-500 text-white text-[10px] px-5 py-2 rounded-bl-[1.5rem] font-black uppercase tracking-widest">New Order</div>
                        <h3 className="font-black text-2xl text-slate-800 mb-2">{item.name}</h3>
                        <p className="text-xs text-slate-500 mb-6 flex items-center gap-2 font-bold bg-slate-50 p-3 rounded-2xl border border-slate-100"><Mail size={14} className="text-pink-400"/> {item.contact}</p>
                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] text-sm text-slate-600 mb-8 line-clamp-3 min-h-[120px] italic leading-relaxed shadow-inner font-medium">「{item.desc || '繪師，這筆委託沒有詳細描述喔。'}」</div>
                        <div className="flex gap-3">
                            <button onClick={() => openModal(item)} className="flex-1 py-4 bg-pink-500 text-white rounded-2xl font-black hover:bg-pink-600 transition-all shadow-xl shadow-pink-200">審核 / 受理</button>
                            <button onClick={() => handleDelete(item.id)} className="px-5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"><Trash2 size={20} /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        <h3 className="text-[10px] font-black text-slate-400 mb-8 flex items-center gap-3 uppercase tracking-[0.3em]">進行中委託列表 Active Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeCommissions.map(item => (
            <div key={item.id} className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all group overflow-hidden relative">
              <div className="flex justify-between items-start mb-8">
                <div><h3 className="font-black text-2xl text-slate-800 mb-1">{item.name}</h3><span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full tracking-widest uppercase border border-blue-100">#{item.code}</span></div>
                <StatusBadge status={item.status} mini />
              </div>
              <div className="space-y-4 mb-10">
                {Object.entries(item.items).filter(([_, i]) => i.active).map(([key, i]) => (
                  <div key={key} className="flex justify-between text-xs items-center bg-slate-50 border border-slate-200/50 p-4 rounded-[1.5rem] font-bold">
                    <span className="text-slate-400 capitalize tracking-tight">{key}</span>
                    <div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${i.preview ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></span><span className="text-blue-600 font-black">{i.progress}%</span></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => openModal(item)} className="flex-1 py-4 text-sm font-black text-slate-600 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-2xl flex items-center justify-center gap-3 transition-all"><Edit3 size={18} /> 管理案情</button>
                <button onClick={() => handleDelete(item.id)} className="px-5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {isModalOpen && <EditModal data={editingItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

// --- 編輯視窗 (方框最大化版) ---
const EditModal = ({ data, onClose, onSave }) => {
  const [form, setForm] = useState(data);
  const [tab, setTab] = useState('info'); 

  const updateItem = (key, field, value) => {
    setForm({ ...form, items: { ...form.items, [key]: { ...form.items[key], [field]: value } } });
  };
  const toggleActive = (key) => updateItem(key, 'active', !form.items[key].active);
  const tabs = [{ id: 'info', label: '基礎' }, { id: 'avatar', label: '頭像' }, { id: 'halfBody', label: '半身' }, { id: 'fullBody', label: '全身' }];

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-[3.5rem] w-full max-w-xl shadow-2xl flex flex-col my-8 border border-white/20">
        <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <h3 className="font-black text-2xl text-slate-800 tracking-tight">編輯委託案詳細資訊</h3>
            <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={32} /></button>
        </div>
        <div className="flex p-5 bg-white border-b border-slate-100 shrink-0 gap-3">
            {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-4 text-xs font-black rounded-[1.5rem] transition-all ${tab === t.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200'}`}>{t.label}</button>
            ))}
        </div>
        
        <div className="p-12 overflow-y-auto custom-scrollbar max-h-[60vh]">
          {tab === 'info' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="input-group">
                    <label className="label">委託案名稱</label>
                    <input type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="input-group border-blue-200 bg-blue-50/30">
                    <label className="label text-blue-500">專屬查詢編號</label>
                    <input type="text" className="input-field font-black text-blue-600 !bg-transparent border-none p-0 focus:ring-0" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label className="label">聯絡管道資訊</label>
                <input type="text" className="input-field" value={form.contact || ''} onChange={e => setForm({...form, contact: e.target.value})} placeholder="例：Email / Discord / Twitter" />
              </div>
              <div className="input-group">
                <label className="label">目前的專案狀態</label>
                <div className="flex bg-slate-100 p-2 rounded-[1.5rem] gap-1.5 border border-slate-200/50">
                  {['pending', 'waiting', 'working', 'done'].map(s => (
                    <button key={s} onClick={() => setForm({...form, status: s})} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${form.status === s ? 'bg-white text-blue-600 shadow-xl border border-slate-100' : 'text-slate-400 hover:text-slate-500'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="label">留言備註 (委託人可見)</label>
                <textarea className="input-field resize-none h-36" value={form.note || form.desc} onChange={e => setForm({...form, note: e.target.value, desc: e.target.value})}></textarea>
              </div>
            </div>
          )}
          {['avatar', 'halfBody', 'fullBody'].includes(tab) && (
            <div className="space-y-12">
              <div className="flex items-center justify-between bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 shadow-inner">
                <span className="font-black text-blue-700 tracking-tight">是否啟用此項目的顯示？</span>
                <button onClick={() => toggleActive(tab)} className={`w-16 h-10 rounded-full transition-all relative shadow-inner ${form.items[tab].active ? 'bg-blue-600 shadow-blue-500/50' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1.5 left-1.5 bg-white w-7 h-7 rounded-full shadow-2xl transition-transform ${form.items[tab].active ? 'translate-x-6' : ''}`}></span>
                </button>
              </div>
              {form.items[tab].active && (
                <div className="space-y-10 animate-in slide-in-from-top-4">
                   <div className="input-group">
                     <label className="label font-black text-blue-600">目前繪製進度 ({form.items[tab].progress}%)</label>
                     <input type="range" min="0" max="100" className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" value={form.items[tab].progress} onChange={e => updateItem(tab, 'progress', parseInt(e.target.value))} />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="input-group">
                       <label className="label font-black text-emerald-600">委託約定金額 ($)</label>
                       <input type="number" className="input-field font-black" value={form.items[tab].price} onChange={e => updateItem(tab, 'price', parseInt(e.target.value) || 0)} />
                     </div>
                     <div className="input-group">
                       <label className="label">款項收取狀況</label>
                       <select className="input-field font-bold cursor-pointer" value={form.items[tab].payment} onChange={e => updateItem(tab, 'payment', e.target.value)}>
                         <option value="none">未收到任何款項</option>
                         <option value="deposit">已收取部分訂金</option>
                         <option value="full">已全額收訖</option>
                       </select>
                     </div>
                   </div>
                   <div className="input-group border-dashed">
                     <label className="label flex items-center gap-2"><ImageIcon size={12}/> 預覽圖片連結 (URL)</label>
                     <input type="text" className="input-field text-xs font-mono !bg-slate-50 p-4 rounded-xl border border-slate-200" placeholder="https://imgur.com/your-image.png" value={form.items[tab].preview || ''} onChange={e => updateItem(tab, 'preview', e.target.value)} />
                     <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-bold tracking-tight">※ 請務必填寫完整的公開網址（如 Imgur / Google Drive 分享網址），委託人才能看到畫稿。</p>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-10 border-t border-slate-100 flex gap-5 shrink-0 bg-slate-50/50 rounded-b-[3.5rem]">
            <button onClick={onClose} className="flex-1 py-5 text-slate-500 font-black hover:bg-slate-200 rounded-[1.5rem] transition-all uppercase tracking-widest text-xs">取消並關閉</button>
            <button onClick={() => onSave(form)} className="flex-[2] bg-blue-600 text-white font-black rounded-[1.5rem] hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all uppercase tracking-[0.2em] text-xs">儲存變更同步雲端</button>
        </div>
      </div>
    </div>
  );
};

// --- Helper UI Components ---
const StatusBadge = ({ status, mini }) => {
  const config = { 
    pending: { bg: 'bg-pink-100', text: 'text-pink-600', label: '待核准', icon: FileQuestion },
    waiting: { bg: 'bg-slate-200', text: 'text-slate-600', label: '排單中', icon: Clock }, 
    working: { bg: 'bg-blue-100', text: 'text-blue-600', label: '繪製中', icon: Activity }, 
    done: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: '已完稿', icon: CheckCircle2 } 
  };
  const { bg, text, label, icon: Icon } = config[status] || config['waiting'];
  if (mini) return <span className={`${bg} ${text} p-2 rounded-xl shadow-sm`}><Icon size={14} /></span>;
  return <span className={`${bg} ${text} rounded-full font-black px-6 py-2.5 text-[10px] flex items-center gap-2 border-2 border-white shadow-md uppercase tracking-[0.2em]`}>
    <Icon size={16} /> {label}
  </span>;
};

// --- 全域高級樣式優化 ---
const styles = `
  .input-group { 
    @apply bg-white border border-slate-200 p-5 rounded-[1.5rem] transition-all duration-300 shadow-sm focus-within:border-blue-400 focus-within:shadow-2xl focus-within:shadow-blue-900/10; 
  }
  .label { 
    @apply block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1; 
  }
  .input-field { 
    @apply w-full p-0 bg-transparent border-none focus:ring-0 outline-none font-black text-slate-800 transition-all text-base placeholder:text-slate-300 placeholder:font-bold; 
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid white; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;

export default App;