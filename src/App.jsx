import React, { useState, useEffect } from 'react';
import { 
  Palette, User, Lock, LayoutGrid, CheckCircle2, 
  AlertCircle, Clock, Sparkles, LogOut, Plus, 
  Edit3, Trash2, MessageCircle, ChevronRight, 
  Save, X, Activity, Image as ImageIcon, DollarSign, CreditCard, 
  Wallet, ShieldCheck, Camera, History, FileText, Download, Cloud,
  Mail, Send, FileQuestion
} from 'lucide-react';

// --- Firebase 整合區 ---
// 這裡改為直接從網址導入，以確保在單一檔案中也能運作
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, 
  doc, onSnapshot, query, orderBy 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// TODO: 請將您在 Firebase 後台拿到的設定貼在這裡
const firebaseConfig = {
   apiKey: "AIzaSyCeHj5Kc6E_ltyXboL7cWSpFClq4FrCrvU",
  authDomain: "commission-hub-cc739.firebaseapp.com",
  projectId: "commission-hub-cc739",
  storageBucket: "commission-hub-cc739.firebasestorage.app",
  messagingSenderId: "1022991297741",
  appId: "1:1022991297741:web:df716fcd268c0d9d2c8d84"
};

// 初始化 Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const GlobalAnnouncement = "🌊 介面升級：全新「區塊化」表單設計，操作更直覺、美觀！";

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

  // 監聽雲端資料庫
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
      console.error("Initialization Error:", err);
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
        showNotification('找不到資料，或委託尚未被接受', 'error');
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
        note: '您的委託已送出，繪師審核中。請留意您的聯絡信箱/方式。',
        items: {
          avatar: { active: requestData.type === 'avatar', progress: 0, price: 0, payment: 'none', preview: '' },
          halfBody: { active: requestData.type === 'halfBody', progress: 0, price: 0, payment: 'none', preview: '' },
          fullBody: { active: requestData.type === 'fullBody', progress: 0, price: 0, payment: 'none', preview: '' },
        },
        timeline: [
          { date: new Date().toISOString().split('T')[0], title: '委託申請', desc: '已送出委託申請，等待繪師確認。' }
        ],
        updatedAt: new Date().toISOString().split('T')[0]
      };
      await addDoc(collection(db, "commissions"), newCommission);
      showNotification('委託申請已送出！請等待繪師聯繫。');
    } catch (e) {
      showNotification('申請失敗: ' + e.message, 'error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600 font-bold">資料庫連線中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-sky-200 selection:text-blue-900">
      <style>{styles}</style>
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl shadow-blue-900/10 flex items-center gap-3 animate-in slide-in-from-top-4 backdrop-blur-md border ${notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-600' : 'bg-emerald-50/90 border-emerald-200 text-emerald-600'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-medium">{notification.msg}</span>
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

// --- 1. 登入介面 ---
const LoginView = ({ onLogin, onRequest }) => {
  const [activeTab, setActiveTab] = useState('client');
  const [formData, setFormData] = useState({ name: '', code: '', password: '' });
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-300/20 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 overflow-hidden">
          <div className="pt-10 pb-6 px-8 text-center bg-gradient-to-b from-blue-50/50 to-transparent">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-sky-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 transform rotate-3">
              <Palette size={36} className="text-white drop-shadow-md" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Commission<span className="text-blue-500">Hub</span></h1>
            <p className="text-slate-500 mt-2 font-medium">Cloud Database Connected</p>
          </div>

          <div className="flex p-2 mx-8 bg-slate-100/80 rounded-2xl mb-8">
            <button onClick={() => setActiveTab('client')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>查詢進度</button>
            <button onClick={() => setActiveTab('artist')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'artist' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>繪師後台</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onLogin(activeTab, formData); }} className="px-8 pb-10 space-y-6">
            {activeTab === 'client' ? (
              <>
                <div className="input-group">
                  <label className="label">委託人名稱</label>
                  <input required type="text" placeholder="您的名稱" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="label">查詢編號</label>
                  <input required type="text" placeholder="ex: STAR01" className="input-field" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                </div>
              </>
            ) : (
              <div className="input-group">
                <label className="label">管理密碼</label>
                <input required type="password" placeholder="admin" className="input-field" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            )}
            <button type="submit" className="w-full py-4 rounded-2xl font-bold text-white shadow-lg bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 active:scale-[0.98] transition-all">
              {activeTab === 'client' ? '查詢進度' : '進入後台'}
            </button>
          </form>

          {activeTab === 'client' && (
            <div className="px-8 pb-10">
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">還沒有委託嗎？</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>
              <button 
                onClick={() => setIsRequestModalOpen(true)}
                className="w-full py-4 rounded-2xl font-bold text-pink-500 border-2 border-pink-100 bg-white hover:bg-pink-50 hover:border-pink-200 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles size={18} /> 我要委託
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

// --- 委託申請表單 ---
const RequestModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', contact: '', type: 'avatar', desc: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 my-8 border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-100 text-pink-500 rounded-xl flex items-center justify-center"><Mail size={20} /></div>
            委託申請
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="input-group">
            <label className="label">您的暱稱</label>
            <input required type="text" className="input-field" placeholder="如何稱呼您？" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="label">聯絡方式</label>
            <input required type="text" className="input-field" placeholder="Email / Discord / Twitter" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
          </div>
          <div className="input-group">
            <label className="label">委託項目</label>
            <select className="input-field" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
              <option value="avatar">大頭貼</option>
              <option value="halfBody">半身插畫</option>
              <option value="fullBody">全身立繪</option>
            </select>
          </div>
          <div className="input-group">
            <label className="label">需求簡述</label>
            <textarea className="input-field resize-none h-32" placeholder="請描述您的角色特徵、構圖想法..." value={form.desc} onChange={e => setForm({...form, desc: e.target.value})}></textarea>
          </div>
          <button type="submit" className="w-full py-4 bg-pink-500 text-white font-bold rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-200 mt-4 flex items-center justify-center gap-2">
            <Send size={20} /> 送出申請
          </button>
        </form>
      </div>
    </div>
  );
};

// --- 2. 委託人儀表板 ---
const ClientDashboard = ({ user, data, onLogout }) => {
  if (!data) return <div className="p-10 text-center">資料讀取錯誤或已被刪除 <button onClick={onLogout} className="underline">登出</button></div>;

  const activeItems = Object.entries(data.items).filter(([_, item]) => item.active);
  const [activeTab, setActiveTab] = useState(activeItems.length > 0 ? activeItems[0][0] : null);
  const [showReceipt, setShowReceipt] = useState(false);

  const tabLabels = { avatar: '大頭貼', halfBody: '半身插畫', fullBody: '全身立繪' };
  const tabIcons = { avatar: User, halfBody: ImageIcon, fullBody: Activity };
  const totalAmount = Object.values(data.items).reduce((acc, curr) => curr.active ? acc + curr.price : acc, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Palette size={18} />
            </div>
            <span className="font-bold text-slate-800 hidden sm:block">CommissionHub</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReceipt(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-bold transition-all">
              <FileText size={16} /> 收據
            </button>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-100 text-sm font-medium transition-colors">
              <LogOut size={16} /> 登出
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 text-white p-5 rounded-[2rem] shadow-lg flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><Sparkles size={18} /></div>
          <p className="text-sm font-medium">{GlobalAnnouncement}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
               <div className="relative z-10">
                 <h1 className="text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">Hi, {data.name}</h1>
                 <p className="text-slate-500 mb-6 font-medium">歡迎回到您的專屬委託進度中心</p>
                 <StatusBadge status={data.status} />
               </div>
               <div className="absolute right-[-40px] top-[-40px] w-64 h-64 bg-blue-50 rounded-full blur-[100px] opacity-60"></div>
            </div>

            {activeItems.length > 0 ? (
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden min-h-[550px]">
                <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
                  {activeItems.map(([key, _]) => {
                    const Icon = tabIcons[key];
                    return (
                      <button key={key} onClick={() => setActiveTab(key)} className={`flex-1 py-5 px-6 font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all border-b-2 ${activeTab === key ? 'text-blue-600 border-blue-600 bg-white' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/50'}`}>
                        <Icon size={18} /> {tabLabels[key]}
                      </button>
                    );
                  })}
                </div>
                <div className="p-10 animate-in fade-in" key={activeTab}>
                   {(() => {
                     const currentItem = data.items[activeTab];
                     const statusInfo = PAYMENT_STATUS[currentItem.payment];
                     const StatusIcon = statusInfo.icon;
                     return (
                       <div className="space-y-10">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className={`p-6 rounded-3xl border ${currentItem.payment === 'full' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</span>
                              <div className="flex items-center gap-1 mt-3"><DollarSign size={20} className="text-slate-400"/><span className="text-3xl font-black text-slate-800">{currentItem.price.toLocaleString()}</span></div>
                           </div>
                           <div className={`p-6 rounded-3xl border ${statusInfo.bg} ${currentItem.payment === 'none' ? 'border-slate-200' : 'border-transparent'}`}>
                              <span className={`text-xs font-bold uppercase tracking-widest opacity-60 ${statusInfo.color}`}>Payment Status</span>
                              <div className={`flex items-center gap-2 mt-3 font-bold text-xl ${statusInfo.color}`}><StatusIcon size={24}/>{statusInfo.label}</div>
                           </div>
                         </div>
                         <div className="p-6 rounded-[2rem] border border-slate-200 bg-slate-50/30">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
                              <Camera size={18} className="text-blue-500" /> 當前預覽 (Preview)
                            </span>
                            <div className="aspect-video w-full bg-white rounded-2xl overflow-hidden border border-slate-200 relative group shadow-inner">
                              {currentItem.preview ? (
                                <>
                                  <img src={currentItem.preview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                    <p className="text-white text-sm font-bold">僅供進度確認，請勿未經許可外流</p>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                  <ImageIcon size={64} className="mb-4 opacity-20" />
                                  <span className="text-sm font-medium">繪製中，尚未上傳預覽圖</span>
                                </div>
                              )}
                            </div>
                         </div>
                         <div>
                           <div className="flex justify-between items-end mb-4 px-2">
                             <span className="font-bold text-slate-700 uppercase tracking-widest text-xs">Completion Progress</span>
                             <span className="text-2xl font-black text-blue-600">{currentItem.progress}%</span>
                           </div>
                           <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                             <div className={`h-full rounded-full transition-all duration-1000 ${currentItem.progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-sky-400'}`} style={{ width: `${currentItem.progress}%` }}></div>
                           </div>
                         </div>
                       </div>
                     );
                   })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm"><p className="text-slate-400 font-medium text-lg">目前尚無啟用的委託項目</p></div>
            )}
          </div>
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-3 mb-6 text-blue-600">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><MessageCircle size={20} /></div>
                  <h3 className="font-bold text-lg">Artist Note</h3>
               </div>
               <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 border border-slate-100 p-5 rounded-2xl italic">
                 "{data.note || "繪師暫無留下特定備註。"}"
               </p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
               <div className="flex items-center gap-3 mb-8 text-slate-800">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center"><History size={20} /></div>
                  <h3 className="font-bold text-lg">Activity Log</h3>
               </div>
               <div className="relative pl-4 space-y-10">
                  <div className="absolute left-[23px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
                  {data.timeline && data.timeline.length > 0 ? data.timeline.map((event, idx) => (
                    <div key={idx} className="relative pl-10 animate-in slide-in-from-left-2">
                       <div className="absolute left-[19px] top-1.5 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white z-10 shadow-sm"></div>
                       <span className="text-xs font-black text-slate-300 block mb-2 tracking-tighter">{event.date}</span>
                       <h4 className="font-bold text-slate-800 text-sm mb-1">{event.title}</h4>
                       <p className="text-xs text-slate-500 leading-relaxed">{event.desc}</p>
                    </div>
                  )) : <p className="text-slate-400 text-sm text-center font-medium">尚無活動紀錄</p>}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- 3. 繪師後台 ---
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
        notify('請為新委託設定一個正式編號', 'error');
        return;
    }
    try {
      const newTimelineEvent = { date: new Date().toISOString().split('T')[0], title: '系統更新', desc: '資料已由繪師端更新。' };
      const dataToSave = { ...data, timeline: [newTimelineEvent, ...(data.timeline || [])], updatedAt: new Date().toISOString().split('T')[0] };
      if (data.id) { await updateDoc(doc(db, "commissions", data.id), dataToSave); notify('雲端資料已同步'); } 
      else { await addDoc(collection(db, "commissions"), dataToSave); notify('新委託建立成功'); }
      setIsModalOpen(false);
    } catch (e) { notify('儲存失敗: ' + e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (confirm('確定要永久刪除這筆資料嗎？')) {
      try { await deleteDoc(doc(db, "commissions", id)); notify('資料已刪除'); } 
      catch (e) { notify('刪除失敗', 'error'); }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-slate-900 text-white sticky top-0 z-40 px-6 py-4 shadow-xl">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"><LayoutGrid size={20} /></div><span className="font-black tracking-tight text-xl">Artist Studio</span></div>
          <button onClick={onLogout} className="text-slate-400 hover:text-white font-bold text-sm bg-white/5 px-4 py-2 rounded-xl transition-all">登出系統</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">委託管理中心</h2>
          <button onClick={() => openModal()} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all"><Plus size={20} /> 新增委託</button>
        </div>

        {pendingRequests.length > 0 && (
          <div className="mb-16">
            <h3 className="text-sm font-black text-pink-500 mb-6 flex items-center gap-2 uppercase tracking-widest"><FileQuestion size={18} /> 待審核申請 ({pendingRequests.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pendingRequests.map(item => (
                    <div key={item.id} className="bg-white border-2 border-pink-100 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl shadow-pink-200/20 hover:border-pink-300 transition-all">
                        <div className="absolute top-0 right-0 bg-pink-500 text-white text-[10px] px-4 py-1.5 rounded-bl-2xl font-black uppercase tracking-widest">New Order</div>
                        <h3 className="font-black text-xl text-slate-800 mb-2">{item.name}</h3>
                        <p className="text-sm text-slate-500 mb-6 flex items-center gap-2 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100"><Mail size={14} className="text-pink-400"/> {item.contact}</p>
                        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-sm text-slate-600 mb-8 line-clamp-3 min-h-[100px] italic leading-relaxed">"{item.desc || '無詳細描述'}"</div>
                        <div className="flex gap-3">
                            <button onClick={() => openModal(item)} className="flex-1 py-3.5 bg-pink-500 text-white rounded-2xl font-black hover:bg-pink-600 transition-all shadow-lg shadow-pink-200">審核 / 接受</button>
                            <button onClick={() => handleDelete(item.id)} className="px-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        <h3 className="text-sm font-black text-slate-400 mb-6 uppercase tracking-widest">進行中委託清單</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeCommissions.map(item => (
            <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div><h3 className="font-black text-xl text-slate-800 mb-1">{item.name}</h3><span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded tracking-widest uppercase">#{item.code}</span></div>
                <StatusBadge status={item.status} mini />
              </div>
              <div className="space-y-3 mb-8">
                {Object.entries(item.items).filter(([_, i]) => i.active).map(([key, i]) => (
                  <div key={key} className="flex justify-between text-xs items-center bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="font-bold text-slate-600 capitalize">{key}</span>
                    <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${i.preview ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span><span className="font-black text-blue-600">{i.progress}%</span></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => openModal(item)} className="flex-1 py-3 text-sm font-black text-slate-600 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-2xl flex items-center justify-center gap-2 transition-all group-hover:bg-blue-50 group-hover:text-blue-600"><Edit3 size={18} /> 管理詳情</button>
                <button onClick={() => handleDelete(item.id)} className="px-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
              </div>
            </div>
          ))}
        </div>
      </main>
      {isModalOpen && <EditModal data={editingItem} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
    </div>
  );
};

// --- 組件: 編輯視窗 ---
const EditModal = ({ data, onClose, onSave }) => {
  const [form, setForm] = useState(data);
  const [tab, setTab] = useState('info'); 

  const updateItem = (key, field, value) => {
    setForm({ ...form, items: { ...form.items, [key]: { ...form.items[key], [field]: value } } });
  };
  const toggleActive = (key) => updateItem(key, 'active', !form.items[key].active);
  const tabs = [{ id: 'info', label: '基本資訊' }, { id: 'avatar', label: '大頭貼' }, { id: 'halfBody', label: '半身插畫' }, { id: 'fullBody', label: '全身立繪' }];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl flex flex-col my-8 border border-white/20">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
            <h3 className="font-black text-2xl text-slate-800 tracking-tight">編輯委託案</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X size={28} /></button>
        </div>
        <div className="flex p-4 bg-white border-b border-slate-100 shrink-0 gap-2">
            {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-3 text-xs font-black rounded-2xl transition-all ${tab === t.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{t.label}</button>
            ))}
        </div>
        
        <div className="p-10 overflow-y-auto custom-scrollbar max-h-[60vh]">
          {tab === 'info' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="input-group">
                    <label className="label">委託人名稱</label>
                    <input type="text" className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="input-group">
                    <label className="label text-blue-500">專案查詢編號</label>
                    <input type="text" className="input-field font-black text-blue-600 border-blue-100 bg-blue-50/30" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label className="label">聯絡方式</label>
                <input type="text" className="input-field" value={form.contact || ''} onChange={e => setForm({...form, contact: e.target.value})} placeholder="Email / Discord / Social Media" />
              </div>
              <div className="input-group">
                <label className="label">目前整體狀態</label>
                <div className="flex bg-slate-100 p-2 rounded-2xl gap-1">
                  {['pending', 'waiting', 'working', 'done'].map(s => (
                    <button key={s} onClick={() => setForm({...form, status: s})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.status === s ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="label">備註內容</label>
                <textarea className="input-field resize-none h-32" value={form.desc || form.note} onChange={e => setForm({...form, note: e.target.value, desc: e.target.value})}></textarea>
              </div>
            </div>
          )}
          {['avatar', 'halfBody', 'fullBody'].includes(tab) && (
            <div className="space-y-10">
              <div className="flex items-center justify-between bg-blue-50 p-6 rounded-[2rem] border border-blue-100 shadow-inner">
                <span className="font-black text-blue-700 tracking-tight">是否啟用此項目？</span>
                <button onClick={() => toggleActive(tab)} className={`w-14 h-8 rounded-full transition-all relative shadow-inner ${form.items[tab].active ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-lg transition-transform ${form.items[tab].active ? 'translate-x-6' : ''}`}></span>
                </button>
              </div>
              {form.items[tab].active && (
                <div className="space-y-8 animate-in slide-in-from-top-4">
                   <div className="input-group">
                     <label className="label">繪製進度 ({form.items[tab].progress}%)</label>
                     <input type="range" min="0" max="100" className="w-full h-4 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600" value={form.items[tab].progress} onChange={e => updateItem(tab, 'progress', parseInt(e.target.value))} />
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                     <div className="input-group">
                       <label className="label">委託金額 ($)</label>
                       <input type="number" className="input-field" value={form.items[tab].price} onChange={e => updateItem(tab, 'price', parseInt(e.target.value) || 0)} />
                     </div>
                     <div className="input-group">
                       <label className="label">付款狀況</label>
                       <select className="input-field" value={form.items[tab].payment} onChange={e => updateItem(tab, 'payment', e.target.value)}>
                         <option value="none">尚未付款</option>
                         <option value="deposit">已收訂金</option>
                         <option value="full">已收全額</option>
                       </select>
                     </div>
                   </div>
                   <div className="input-group">
                     <label className="label">預覽圖片連結 (URL)</label>
                     <input type="text" className="input-field text-xs font-mono" placeholder="https://imgur.com/..." value={form.items[tab].preview || ''} onChange={e => updateItem(tab, 'preview', e.target.value)} />
                     <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1"><AlertCircle size={10}/> 請確保圖片連結為公開存取，以便委託人查看。</p>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-8 border-t border-slate-100 flex gap-4 shrink-0 bg-slate-50/50 rounded-b-[3rem]">
            <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-black hover:bg-slate-200 rounded-2xl transition-all">取消返回</button>
            <button onClick={() => onSave(form)} className="flex-[2] bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all">儲存並同步雲端</button>
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
  return <span className={`${bg} ${text} rounded-full font-black px-6 py-2.5 text-xs flex items-center gap-2 border-2 border-white shadow-md uppercase tracking-widest`}><Icon size={16} /> {label}</span>;
};

// --- 全域樣式 ---
const styles = `
  .input-group { 
    @apply bg-slate-50/50 border border-slate-200 p-5 rounded-[1.5rem] transition-all focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-blue-900/5; 
  }
  .label { 
    @apply block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3 ml-1; 
  }
  .input-field { 
    @apply w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-0 focus:border-blue-500 outline-none font-bold text-slate-800 transition-all shadow-sm; 
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
`;

export default App;